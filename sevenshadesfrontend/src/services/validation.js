const required = {
  signup_submit: ['mobileno','fname','lname','emailid','password','confirm_password','otp','challenge_id'],
  check_costumer_login: ['mobileno','password'], check_admin_login: ['emailid','password'], delivery_rider_login: ['phone','password'],
  otp_request: ['mobileno','purpose'], otp_login: ['mobileno','otp','challenge_id'], reset_password: ['mobileno','otp','challenge_id','password','confirm_password'],
  address_submit: ['address','city','country','postcode','address_type'], address_update: ['address','city','country','postcode','address_type'],
  delivery_rider_create: ['name','phone','password','bike_number','zone'],
  maincategory_submit: ['maincategoryname'], editmaincategory_data: ['id','maincategoryname'],
  mysubcategory_submit: ['maincategoryid','subcategoryname'], editmysubcategory_data: ['id','maincategoryid','subcategoryname'],
  brand_submit: ['brandname'], editbrand_data: ['id','brandname'],
  product_submit: ['maincategoryid','subcategoryid','brandid','productname','description'], editproduct_data: ['id','maincategoryid','subcategoryid','brandid','productname','description'],
  productdetails_submit: ['maincategoryid','subcategoryid','brandid','productid','productsubname','description','qty','price','offerprice','color','size','offertype'],
  editproductdetails_data: ['id','maincategoryid','subcategoryid','brandid','productid','productsubname','description','qty','price','offerprice','color','size','offertype'],
  productdetails_batch_submit: ['maincategoryid','subcategoryid','brandid','productid','productsubname','description','color','offertype','variants'],
};
const limits = { fname:70, lname:70, name:120, maincategoryname:70, subcategoryname:70, brandname:70, productname:70, productsubname:70, description:150, color:70, size:70, offertype:70, sku:60, bannerdescription:70, address:70, city:70, country:70, zone:70, bike_number:40, review_text:2000 };

// One size row of a productdetails_batch_submit variants array.
export function validateVariantRow(row) {
  if (!row || typeof row !== 'object') return 'Each size row is invalid.';
  if (typeof row.size !== 'string' || !row.size.trim() || row.size.length > 70) return 'Each size needs a valid label.';
  if (!/^[0-9]+$/.test(String(row.qty)) || Number(row.qty) < 0 || Number(row.qty) > 100000) return 'Enter stock (0–100000) for every size.';
  if (!/^[0-9]+$/.test(String(row.price)) || Number(row.price) < 1) return 'Enter a price (1 or more) for every size.';
  const offer = row.offerprice === '' || row.offerprice === undefined || row.offerprice === null ? 0 : row.offerprice;
  if (!/^[0-9]+$/.test(String(offer)) || Number(offer) < 0) return 'Offer price must be a whole number (0 for none).';
  if (Number(offer) > Number(row.price)) return 'Offer price cannot exceed the regular price.';
  if (row.sku !== undefined && row.sku !== null && (typeof row.sku !== 'string' || row.sku.length > 60)) return 'SKU must be text up to 60 characters.';
  return '';
}

export function validateFields(endpoint, body) {
  const data = body instanceof FormData ? Object.fromEntries(body.entries()) : body || {};
  const errors = {};
  if (endpoint === 'productdetails_batch_submit') {
    let rows = data.variants;
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { rows = null; } }
    if (!Array.isArray(rows) || !rows.length) errors.variants = 'Add at least one size with stock and price.';
    else if (rows.length > 20) errors.variants = 'Add at most 20 sizes per submission.';
    else {
      const seen = new Set();
      for (const row of rows) {
        const rowError = validateVariantRow(row);
        if (rowError) { errors.variants = rowError; break; }
        const key = String(row.size).trim().toLowerCase();
        if (seen.has(key)) { errors.variants = 'The same size is selected more than once.'; break; }
        seen.add(key);
      }
    }
  }
  if ((['maincategory_submit','mysubcategory_submit','brand_submit','product_submit','productdetails_submit','banner_submit'].includes(endpoint) || endpoint.endsWith('_icon')) && !(data.icon instanceof File)) errors.icon = 'Choose an image to upload.';
  if (body instanceof FormData) {
    const uploads = [...body.values()].filter(value => value instanceof File);
    if (uploads.length > 10) errors.icon = 'Upload at most 10 images at a time.';
    if (uploads.some(file => file.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp|avif|gif)$/i.test(file.name))) errors.icon = 'Choose valid images up to 5 MB each.';
  }
  for (const key of required[endpoint] || []) if (data[key] === undefined || data[key] === null || String(data[key]).trim() === '') errors[key] = 'This field is required.';
  for (const [key, value] of Object.entries(data)) {
    if (limits[key] && !(key === 'address' && endpoint === 'try_order_create') && (typeof value !== 'string' || value.length > limits[key] || (!value.trim() && !['review_text','bannerdescription','sku'].includes(key)))) errors[key] = 'Enter valid text up to ' + limits[key] + ' characters.';
    if (['mobileno','mobile','phone','user_mobile'].includes(key) && !/^[6-9][0-9]{9}$/.test(String(value))) errors[key] = 'Enter a 10-digit mobile number starting with 6–9.';
    if (key === 'emailid' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 70)) errors[key] = 'Enter a valid email address.';
    if (key === 'postcode' && !/^[1-9][0-9]{5}$/.test(value)) errors[key] = 'Enter a valid 6-digit PIN code.';
    if (['password','confirm_password'].includes(key) && (typeof value !== 'string' || !value.trim() || value.length > 128)) errors[key] = 'Enter a password up to 128 characters.';
    if (key === 'otp' && !/^[0-9]{6}$/.test(value)) errors[key] = 'Enter the 6-digit OTP.';
    if (['qty','price','offerprice','rating','id','maincategoryid','subcategoryid','brandid','productid','product_details_id','try_order_item_id','return_id','address_id','bill_revision'].includes(key)) {
      const min = ['qty','offerprice','bill_revision'].includes(key) ? 0 : 1;
      const max = key === 'rating' ? 5 : 2147483647;
      if (typeof value === 'boolean' || !/^[0-9]+$/.test(String(value)) || Number(value) < min || Number(value) > max) errors[key] = 'Enter a valid whole number (' + min + '–' + max + ').';
    }
    if (value instanceof File && (value.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp|avif|gif)$/i.test(value.name))) errors[key] = 'Choose an image up to 5 MB (JPG, PNG, WebP, AVIF or GIF).';
  }
  if (Number(data.offerprice) > Number(data.price)) errors.offerprice = 'Offer price cannot exceed the regular price.';
  if (['signup_submit','reset_password','delivery_rider_create'].includes(endpoint) && (typeof data.password !== 'string' || data.password.length < 8 || /^[0-9]+$/.test(data.password))) errors.password = 'Use at least 8 characters; avoid a numeric-only password.';
  if (data.confirm_password !== undefined && data.password !== data.confirm_password) errors.confirm_password = 'Passwords do not match.';
  return errors;
}
