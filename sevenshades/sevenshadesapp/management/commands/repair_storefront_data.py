from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Avg, Count

from sevenshadesapp.models import (
    Banner,
    Brands,
    MainCategory,
    MySubCategory,
    Product,
    ProductDetails,
    ProductReview,
)


HERO_BANNERS = (
    {
        "audience": "Men",
        "description": "Men|The Everyday Edit|Try up to 4 styles at home",
        "icon": "static/sevenshades-men-hero.png",
    },
    {
        "audience": "Women",
        "description": "Women|Made for every version of you|Pay only for what you keep",
        "icon": "static/sevenshades-women-hero.png",
    },
)

PRIVATE_LABEL_PRODUCTS = {
    "Rare Rabbit Floral Tiered Maxi Dress": "SevenShades Floral Tiered Maxi Dress",
    "SevenShades Anarkali Cotton Kurta Set": "SevenShades Anarkali Cotton Kurta Set",
    "Aurelia Floral Embroidered Straight Kurti": "SevenShades Floral Embroidered Straight Kurti",
    "Rare Rabbit Satin Wrap Collar Top": "SevenShades Satin Wrap Collar Top",
}


def canonical_media_path(value):
    value = str(value or "").strip().replace("\\", "/").lstrip("/")
    if not value:
        return ""
    if value.startswith("media/"):
        value = value[6:]
    return value if value.startswith("static/") else f"static/{value}"


class Command(BaseCommand):
    help = "Repair and validate realistic, internally consistent storefront catalog data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--check",
            action="store_true",
            help="Validate storefront data without changing the database.",
        )

    def handle(self, *args, **options):
        if options["check"]:
            issues = self.audit()
            if issues:
                raise CommandError("Storefront data issues:\n- " + "\n- ".join(issues))
            self.stdout.write(self.style.SUCCESS("Storefront data is consistent."))
            return

        with transaction.atomic():
            changes = self.repair()

        issues = self.audit()
        if issues:
            raise CommandError("Repair finished but validation still found:\n- " + "\n- ".join(issues))

        self.stdout.write(
            self.style.SUCCESS(
                "Storefront data repaired successfully "
                f"({changes} records updated; {Product.objects.count()} products, "
                f"{ProductDetails.objects.count()} variants, {Banner.objects.count()} banners)."
            )
        )

    def repair(self):
        changes = 0

        # Consistent customer-facing labels.
        changes += MainCategory.objects.filter(maincategoryname__iexact="women").exclude(
            maincategoryname="Women"
        ).update(maincategoryname="Women")
        changes += MainCategory.objects.filter(maincategoryname__iexact="men").exclude(
            maincategoryname="Men"
        ).update(maincategoryname="Men")
        subcategory_names = {
            "shoes": "Shoes",
            "kurti's": "Kurtis",
            "oversized t-shirts": "Oversized T-Shirts",
        }
        for current, replacement in subcategory_names.items():
            changes += MySubCategory.objects.filter(subcategoryname__iexact=current).exclude(
                subcategoryname=replacement
            ).update(subcategoryname=replacement)

        private_label, created = Brands.objects.get_or_create(
            brandname="SevenShades",
            defaults={"icon": "static/sevenshades-logo.png"},
        )
        if created:
            changes += 1
        elif str(private_label.icon) != "static/sevenshades-logo.png":
            private_label.icon = "static/sevenshades-logo.png"
            private_label.save(update_fields=["icon"])
            changes += 1

        # Correct products whose displayed label and assigned brand disagreed.
        for old_name, new_name in PRIVATE_LABEL_PRODUCTS.items():
            product = Product.objects.filter(productname=old_name).first()
            if not product:
                product = Product.objects.filter(productname=new_name).first()
            if not product:
                continue
            update_fields = []
            if product.productname != new_name:
                product.productname = new_name
                update_fields.append("productname")
            if product.brandid_id != private_label.id:
                product.brandid = private_label
                update_fields.append("brandid")
            if update_fields:
                product.save(update_fields=update_fields)
                changes += 1

        # Product details must mirror the parent catalog relationships. Paths are
        # normalized so every image resolves through /media/static/ consistently.
        for product in Product.objects.select_related(
            "maincategoryid", "subcategoryid", "brandid"
        ).prefetch_related("productdetails_set"):
            product_icon = canonical_media_path(product.icon)
            if str(product.icon) != product_icon:
                product.icon = product_icon
                product.save(update_fields=["icon"])
                changes += 1

            for variant in product.productdetails_set.all():
                update_fields = []
                relationships = {
                    "maincategoryid": product.maincategoryid,
                    "subcategoryid": product.subcategoryid,
                    "brandid": product.brandid,
                }
                for field, expected in relationships.items():
                    if getattr(variant, f"{field}_id") != expected.id:
                        setattr(variant, field, expected)
                        update_fields.append(field)

                images = ",".join(
                    canonical_media_path(path)
                    for path in str(variant.icon or "").split(",")
                    if path.strip()
                )
                if variant.icon != images:
                    variant.icon = images
                    update_fields.append("icon")

                product_subname = f"{product.productname} - {variant.color}"[:70]
                description = (
                    f"{product.productname} in {variant.color}, size {variant.size}. "
                    "Available for doorstep Try & Buy."
                )[:150]
                discount = (
                    round((variant.price - variant.offerprice) * 100 / variant.price)
                    if variant.price > 0 and 0 < variant.offerprice < variant.price
                    else 0
                )
                offer_type = "Best Value" if discount >= 35 else "Everyday Deal"
                for field, value in {
                    "productsubname": product_subname,
                    "description": description,
                    "offertype": offer_type,
                }.items():
                    if getattr(variant, field) != value:
                        setattr(variant, field, value)
                        update_fields.append(field)

                review_summary = ProductReview.objects.filter(product_details=variant).aggregate(
                    average=Avg("rating"), total=Count("id")
                )
                average = round(float(review_summary["average"] or 0), 1)
                total = review_summary["total"] or 0
                if variant.avg_rating != average:
                    variant.avg_rating = average
                    update_fields.append("avg_rating")
                if variant.total_reviews != total:
                    variant.total_reviews = total
                    update_fields.append("total_reviews")

                if update_fields:
                    variant.save(update_fields=list(dict.fromkeys(update_fields)))
                    changes += 1

        existing = list(Banner.objects.order_by("id")[:2])
        for index, banner_spec in enumerate(HERO_BANNERS):
            banner = existing[index] if index < len(existing) else Banner()
            if (
                banner.bannerdescription != banner_spec["description"]
                or banner.icon != banner_spec["icon"]
            ):
                banner.bannerdescription = banner_spec["description"]
                banner.icon = banner_spec["icon"]
                banner.save()
                changes += 1

        return changes

    def audit(self):
        issues = []
        static_root = Path(settings.MEDIA_ROOT) / "static"

        if not MainCategory.objects.filter(maincategoryname="Men").exists():
            issues.append("Men category is missing.")
        if not MainCategory.objects.filter(maincategoryname="Women").exists():
            issues.append("Women category is missing.")

        for product in Product.objects.select_related("maincategoryid", "subcategoryid", "brandid"):
            if product.subcategoryid.maincategoryid_id != product.maincategoryid_id:
                issues.append(f"Product {product.id} is assigned to a subcategory from another category.")
            if not product.productdetails_set.exists():
                issues.append(f"Product {product.id} has no sellable variants.")
            self.check_image(issues, static_root, "product", product.id, str(product.icon))

        for variant in ProductDetails.objects.select_related("productid"):
            product = variant.productid
            if (
                variant.maincategoryid_id != product.maincategoryid_id
                or variant.subcategoryid_id != product.subcategoryid_id
                or variant.brandid_id != product.brandid_id
            ):
                issues.append(f"Variant {variant.id} relationships do not match its product.")
            if variant.qty < 0 or variant.price <= 0:
                issues.append(f"Variant {variant.id} has invalid stock or price.")
            if variant.offerprice < 0 or variant.offerprice > variant.price:
                issues.append(f"Variant {variant.id} has an invalid offer price.")
            actual = ProductReview.objects.filter(product_details=variant).aggregate(
                average=Avg("rating"), total=Count("id")
            )
            if variant.total_reviews != (actual["total"] or 0):
                issues.append(f"Variant {variant.id} review count is not backed by review rows.")
            expected_average = round(float(actual["average"] or 0), 1)
            if round(float(variant.avg_rating), 1) != expected_average:
                issues.append(f"Variant {variant.id} rating is not backed by review rows.")
            for path in str(variant.icon or "").split(","):
                if path.strip():
                    self.check_image(issues, static_root, "variant", variant.id, path)

        for kind, rows in (
            ("category", MainCategory.objects.all()),
            ("subcategory", MySubCategory.objects.all()),
            ("brand", Brands.objects.all()),
        ):
            for row in rows:
                self.check_image(issues, static_root, kind, row.id, str(row.icon))

        banners = list(Banner.objects.order_by("id")[:2])
        if len(banners) < 2:
            issues.append("Both Men and Women hero banners are required.")
        for banner in banners:
            if not banner.bannerdescription.strip():
                issues.append(f"Banner {banner.id} has no navigation/campaign description.")
            for path in banner.icon.split(","):
                if path.strip():
                    self.check_image(issues, static_root, "banner", banner.id, path)

        return issues

    @staticmethod
    def check_image(issues, static_root, kind, record_id, value):
        normalized = canonical_media_path(value).removeprefix("static/")
        if not normalized or not (static_root / normalized).is_file():
            issues.append(f"{kind.title()} {record_id} references a missing image: {value!r}.")
