package com.doordrape.app;

import android.app.*;
import android.os.Bundle;
import android.content.*;
import android.net.Uri;
import android.graphics.Bitmap;
import android.view.*;
import android.webkit.*;
import android.widget.*;

/** Thin, origin-restricted client. No native JavaScript bridge or embedded credentials. */
public final class MainActivity extends Activity {
    private WebView web;
    private LinearLayout bottomNav;
    private final TextView[] navLabels = new TextView[4];
    private final String[] destinations = {"/", "/mybagdisplay", "/profile#orders", "/profile#account"};
    private int selectedTab = 0;
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void addBottomNavigation(LinearLayout root) {
        bottomNav = new LinearLayout(this);
        bottomNav.setBackgroundColor(0xffffffff);
        bottomNav.setElevation(dp(6));
        bottomNav.setPadding(dp(8), dp(7), dp(8), dp(7));
        String[] labels = {"Home", "Try Bag", "Orders", "Profile"};
        int[] icons = {android.R.drawable.ic_menu_view, android.R.drawable.ic_menu_agenda, android.R.drawable.ic_menu_recent_history, android.R.drawable.ic_menu_myplaces};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            TextView item = new TextView(this);
            item.setText(labels[i]);
            android.graphics.drawable.Drawable icon = new NavigationIcon(i);
            icon.setBounds(0, 0, dp(24), dp(24));
            item.setCompoundDrawables(null, icon, null, null);
            item.setCompoundDrawablePadding(dp(3));
            item.setPadding(0, dp(8), 0, dp(6));
            item.setTextSize(12);
            item.setTypeface(android.graphics.Typeface.create("sans-serif-medium", 0));
            item.setGravity(Gravity.CENTER);
            item.setContentDescription(labels[i]);
            item.setFocusable(true);
            item.setClickable(true);
            item.setOnClickListener(v -> {
                selectedTab = index;
                updateBottomNavigation("https://doordrape.com" + destinations[index]);
                error.setVisibility(View.GONE);
                String target = "https://doordrape.com" + destinations[index];
                if (target.equals(web.getUrl())) { selectProfileSection(target); return; }
                web.loadUrl(target);
            });
            navLabels[i] = item;
            LinearLayout.LayoutParams tabLayout = new LinearLayout.LayoutParams(0, dp(58), 1);
            tabLayout.setMargins(dp(4), 0, dp(4), 0);
            bottomNav.addView(item, tabLayout);
        }
        root.addView(bottomNav, new LinearLayout.LayoutParams(-1, -2));
        updateBottomNavigation(HOME);
    }
    private void updateBottomNavigation(String url) {
        if (bottomNav == null || url == null) return;
        Uri uri = Uri.parse(url);
        String path = uri.getPath() == null ? "" : uri.getPath();
        bottomNav.setVisibility(path.startsWith("/admin") || path.startsWith("/delivery") ? View.GONE : View.VISIBLE);
        if (path.equals("/") || path.equals("/home")) selectedTab = 0;
        else if (path.equals("/mybagdisplay")) selectedTab = 1;
        else if (path.equals("/profile")) selectedTab = "account".equals(uri.getFragment()) ? 3 : 2;
        for (int i = 0; i < navLabels.length; i++) {
            navLabels[i].setSelected(i == selectedTab);
            navLabels[i].getCompoundDrawables()[1].setTint(i == selectedTab ? 0xff047857 : 0xff64748b);
            navLabels[i].setTextColor(i == selectedTab ? 0xff047857 : 0xff64748b);
            android.graphics.drawable.GradientDrawable pill = new android.graphics.drawable.GradientDrawable();
            pill.setCornerRadius(dp(18));
            pill.setColor(i == selectedTab ? 0xffe7f4ee : 0xffffffff);
            navLabels[i].setBackground(new android.graphics.drawable.RippleDrawable(
                android.content.res.ColorStateList.valueOf(0x22047857), pill, null));
        }
    }
    private void selectProfileSection(String url) {
        if (url == null || !trusted(Uri.parse(url)) || !"/profile".equals(Uri.parse(url).getPath())) return;
        // Existing website tabs stay unchanged; app links select their matching section.
        web.evaluateJavascript("(function(){let n=0;clearInterval(window.__ddTabTimer);window.__ddTabTimer=setInterval(function(){if(location.pathname!='/profile'||++n>40){clearInterval(window.__ddTabTimer);return;}let name=location.hash==='#account'?'Account':'Orders';let t=Array.from(document.querySelectorAll('[role=tab]')).find(x=>x.textContent.includes(name));if(t){t.click();clearInterval(window.__ddTabTimer);}},250);})()", null);
    }
    private ProgressBar progress;
    private LinearLayout error;
    private ValueCallback<Uri[]> upload;
    private boolean failed;
    private static final String HOME = "https://doordrape.com/";

    private boolean isReceipt(Uri uri) {
        return "https".equals(uri.getScheme()) && "try-and-buy-model.onrender.com".equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && "/api/receipt_download".equals(uri.getPath());
    }
    private void downloadReceipt(Uri uri) {
        if (!isReceipt(uri)) return;
        try {
            DownloadManager.Request request = new DownloadManager.Request(uri);
            String cookies = CookieManager.getInstance().getCookie(uri.toString());
            if (cookies != null) request.addRequestHeader("Cookie", cookies);
            request.setTitle("DoorDrape payment receipt");
            request.setMimeType("text/html");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, android.os.Environment.DIRECTORY_DOWNLOADS,
                "DoorDrape-receipt-" + System.currentTimeMillis() + ".html");
            ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            Toast.makeText(this, "Receipt downloading. Open it from Downloads notification.", Toast.LENGTH_LONG).show();
        } catch (RuntimeException e) {
            Toast.makeText(this, "Receipt download could not start. Please try again.", Toast.LENGTH_LONG).show();
        }
    }
    private boolean trusted(Uri uri) {
        return "https".equals(uri.getScheme()) && "doordrape.com".equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setFitsSystemWindows(true);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, 6));
        FrameLayout frame = new FrameLayout(this);
        root.addView(frame, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        frame.addView(web, new FrameLayout.LayoutParams(-1, -1));
        error = new LinearLayout(this);
        error.setOrientation(LinearLayout.VERTICAL);
        error.setGravity(Gravity.CENTER);
        error.setPadding(32, 32, 32, 32);
        error.setBackgroundColor(0xfff8fafc);
        TextView message = new TextView(this);
        message.setText("DoorDrape\n\nWe couldn't connect.\nCheck your connection and try again.");
        message.setTextSize(20);
        message.setGravity(Gravity.CENTER);
        error.addView(message);
        Button retry = new Button(this);
        retry.setText("Try again");
        retry.setOnClickListener(v -> { error.setVisibility(View.GONE); web.loadUrl(HOME); });
        error.addView(retry);
        frame.addView(error, new FrameLayout.LayoutParams(-1, -1));
        error.setVisibility(View.GONE);
        addBottomNavigation(root);
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " DoorDrapeAndroid/1.2.0");
        CookieManager.getInstance().setAcceptCookie(true);
        // Existing API uses cross-origin secure session cookies.
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                Uri uri = req.getUrl();
                if (trusted(uri)) return false;
                if (isReceipt(uri)) { downloadReceipt(uri); return true; }
                String scheme = uri.getScheme();
                if ("https".equals(scheme) || "mailto".equals(scheme) || "tel".equals(scheme) || "upi".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                    catch (ActivityNotFoundException e) { Toast.makeText(MainActivity.this, "No app available to open this link", Toast.LENGTH_LONG).show(); }
                }
                return true;
            }
            @Override public void onPageStarted(WebView v, String url, Bitmap icon) {
                failed = false; progress.setVisibility(View.VISIBLE);
                updateBottomNavigation(url);
            }
            @Override public void onPageFinished(WebView v, String url) {
                progress.setVisibility(View.GONE);
                if (!failed) error.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                updateBottomNavigation(url);
                selectProfileSection(url);
            }
            @Override public void doUpdateVisitedHistory(WebView v, String url, boolean reload) {
                updateBottomNavigation(url);
                selectProfileSection(url);
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) showFailure();
            }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse response) {
                if (r.isForMainFrame() && response.getStatusCode() >= 400) showFailure();
            }
            // Certificate failures retain WebView's default cancel behavior.
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v, int value) { progress.setProgress(value); }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (upload != null) upload.onReceiveValue(null);
                upload = callback;
                try { startActivityForResult(params.createIntent(), 11); }
                catch (ActivityNotFoundException e) { upload.onReceiveValue(null); upload = null; }
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, type, length) -> {
            if (isReceipt(Uri.parse(url))) { downloadReceipt(Uri.parse(url)); }
            else if ("https".equals(Uri.parse(url).getScheme())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (ActivityNotFoundException e) { Toast.makeText(this, "Open this download in your browser", Toast.LENGTH_LONG).show(); }
            } else Toast.makeText(this, "For this invoice, use DoorDrape in your browser", Toast.LENGTH_LONG).show();
        });
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(HOME);
    }
    private void showFailure() { failed = true; progress.setVisibility(View.GONE); error.setVisibility(View.VISIBLE); }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 11 && upload != null) {
            upload.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); upload = null;
        }
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else new AlertDialog.Builder(this).setMessage("Close DoorDrape?").setNegativeButton("Stay", null)
            .setPositiveButton("Close", (dialog, which) -> finish()).show();
    }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onPause() { web.onPause(); CookieManager.getInstance().flush(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (upload != null) upload.onReceiveValue(null);
        web.destroy(); super.onDestroy();
    }
}
