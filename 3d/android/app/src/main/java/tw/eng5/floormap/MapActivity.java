package tw.eng5.floormap;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;
import org.json.JSONException;
import org.json.JSONObject;

public final class MapActivity extends Activity {
    private static final String PAGE = "file:///android_asset/floor-1.html?host=android";
    private WebView map;
    private Button showFloor;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        showFloor = new Button(this);
        showFloor.setText("顯示工程五館 1F");
        showFloor.setEnabled(false);
        layout.addView(showFloor);
        map = new WebView(this);
        layout.addView(map, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(layout);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        map.getSettings().setJavaScriptEnabled(true);
        map.getSettings().setAllowFileAccess(false);
        map.getSettings().setAllowContentAccess(false);
        map.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (PAGE.equals(url)) renderFloor();
            }
        });
        showFloor.setOnClickListener(v -> renderFloor());
        map.loadUrl(PAGE);
    }

    private void renderFloor() {
        showFloor.setEnabled(false);
        // The Three.js scene stays in the page. Only the serializable result crosses WebView.
        map.evaluateJavascript("(() => { const {scene, ...result} = window.renderMap(); return result; })()", value -> {
            showFloor.setEnabled(true);
            try {
                JSONObject result = new JSONObject(value);
                if ("success".equals(result.getString("status"))) return;
                Toast.makeText(this, result.getJSONObject("error").getString("message"), Toast.LENGTH_LONG).show();
            } catch (JSONException ex) {
                Toast.makeText(this, "無法啟動地圖，請確認 Android System WebView 版本。", Toast.LENGTH_LONG).show();
            }
        });
    }

    @Override protected void onDestroy() {
        ((LinearLayout) map.getParent()).removeView(map);
        map.destroy();
        super.onDestroy();
    }
}
