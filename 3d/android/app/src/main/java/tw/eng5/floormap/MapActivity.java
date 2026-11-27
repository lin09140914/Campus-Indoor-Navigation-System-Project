package tw.eng5.floormap;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import java.io.IOException;
import java.util.Collections;
import org.json.JSONObject;

public final class MapActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String PAGE = "https://" + HOST + "/assets/viewer.html?host=android";
    private WebView map;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this);
        layout.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        map = new WebView(this);
        layout.addView(map, new LinearLayout.LayoutParams(-1, -1));
        setContentView(layout);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        map.getSettings().setJavaScriptEnabled(true);
        map.getSettings().setAllowFileAccess(false);
        map.getSettings().setAllowContentAccess(false);
        map.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true;
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getAuthority()) && path != null
                        && !uri.getPathSegments().contains("..") && !path.contains("\\")
                        && (path.equals("/assets/viewer.html") || (path.startsWith("/assets/data/svg/") && path.endsWith(".svg")))) {
                    String type = path.endsWith(".svg") ? "image/svg+xml" : "text/html";
                    try {
                        return new WebResourceResponse(type, "UTF-8", getAssets().open(path.substring("/assets/".length())));
                    } catch (IOException missingAsset) {
                        // Report missing drawings as HTTP errors to fetch().
                    }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), null);
            }

            @Override public void onPageFinished(WebView view, String url) {
                if (PAGE.equals(url)) showMap("data/svg/floor-1.svg");
            }
        });
        map.loadUrl(PAGE);
    }

    // Call on the UI thread after viewer.html has loaded.
    public void showMap(String assetPath) {
        map.evaluateJavascript("void window.renderMap(" + JSONObject.quote(assetPath) + ")", null);
    }

    @Override protected void onDestroy() {
        ((LinearLayout) map.getParent()).removeView(map);
        map.destroy();
        super.onDestroy();
    }
}
