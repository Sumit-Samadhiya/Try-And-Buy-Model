package com.doordrape.app;

import android.graphics.*;
import android.graphics.drawable.Drawable;

/** Consistent 24-unit outline icons, scaled without bitmap assets. */
public final class NavigationIcon extends Drawable {
    private final int type;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    public NavigationIcon(int type) {
        this.type = type;
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(1.8f);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);
        paint.setColor(0xff64748b);
    }
    @Override public void draw(Canvas c) {
        c.save();
        c.translate(getBounds().left, getBounds().top);
        c.scale(getBounds().width() / 24f, getBounds().height() / 24f);
        Path p = new Path();
        if (type == 0) {
            p.moveTo(3, 10); p.lineTo(12, 3); p.lineTo(21, 10);
            p.moveTo(5, 9); p.lineTo(5, 21); p.lineTo(10, 21); p.lineTo(10, 14);
            p.lineTo(14, 14); p.lineTo(14, 21); p.lineTo(19, 21); p.lineTo(19, 9);
        } else if (type == 1) {
            c.drawRoundRect(4, 7, 20, 21, 2, 2, paint);
            p.moveTo(8, 9); p.lineTo(8, 6); p.cubicTo(8, 1, 16, 1, 16, 6); p.lineTo(16, 9);
        } else if (type == 2) {
            c.drawRoundRect(5, 3, 19, 21, 2, 2, paint);
            p.moveTo(9, 8); p.lineTo(15, 8); p.moveTo(9, 12); p.lineTo(15, 12);
            p.moveTo(9, 16); p.lineTo(13, 16);
        } else {
            c.drawCircle(12, 7, 4, paint);
            p.moveTo(4, 21); p.lineTo(4, 19); p.cubicTo(4, 11, 20, 11, 20, 19); p.lineTo(20, 21);
        }
        c.drawPath(p, paint); c.restore();
    }
    @Override public void setTint(int color) { paint.setColor(color); invalidateSelf(); }
    @Override public void setAlpha(int alpha) { paint.setAlpha(alpha); invalidateSelf(); }
    @Override public void setColorFilter(ColorFilter filter) { paint.setColorFilter(filter); invalidateSelf(); }
    @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
}
