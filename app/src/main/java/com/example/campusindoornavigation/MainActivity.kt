package com.example.campusindoornavigation

import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

// Field names follow the shared Destination specification.
data class Destination(val id: String, val name: String, val floor: Int)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(Modifier.fillMaxSize()) {
                    NavigationScreen()
                }
            }
        }
    }
}

// Reads app/src/main/assets/destinations.json
private fun parseDestinations(text: String): List<Destination> =
    Json.parseToJsonElement(text).jsonObject.getValue("locations").jsonArray.map {
        val item = it.jsonObject
        Destination(
            id = item.getValue("id").jsonPrimitive.content,
            name = item.getValue("name").jsonPrimitive.content,
            floor = item.getValue("floor").jsonPrimitive.int
        )
    }

@Composable
fun NavigationScreen() {
    val context = LocalContext.current
    val destinations = remember {
        runCatching {
            val text = context.assets.open("destinations.json")
                .bufferedReader().use { it.readText() }
            parseDestinations(text)
        }.getOrDefault(emptyList())
    }

    var selectedId by rememberSaveable { mutableStateOf<String?>(null) }
    var mode by rememberSaveable { mutableStateOf("any") }
    var menuOpen by remember { mutableStateOf(false) }
    val selected = destinations.find { it.id == selectedId }

    Column(
        modifier = Modifier.fillMaxSize().safeDrawingPadding().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("校園室內導航", style = MaterialTheme.typography.headlineSmall)

        if (destinations.isEmpty()) {
            Text(
                "無法載入目的地資料，請確認圖資檔案。\nDestination data is unavailable.",
                color = MaterialTheme.colorScheme.error
            )
        }

        Box {
            OutlinedButton(
                onClick = { menuOpen = true },
                enabled = destinations.isNotEmpty(),
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
            ) {
                Text(selected?.let { "${it.floor}F  ${it.name}" } ?: "選擇目的地 Destination")
            }
            DropdownMenu(
                expanded = menuOpen,
                onDismissRequest = { menuOpen = false },
                modifier = Modifier.heightIn(max = 360.dp)
            ) {
                destinations.forEach { place ->
                    DropdownMenuItem(
                        text = { Text("${place.floor}F  ${place.name}") },
                        onClick = {
                            selectedId = place.id
                            menuOpen = false
                        }
                    )
                }
            }
        }

        // The codes any / stair / elev are fixed by the shared specification.
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("any" to "不限", "stair" to "樓梯", "elev" to "電梯").forEach { (code, label) ->
                FilterChip(
                    selected = mode == code,
                    onClick = { mode = code },
                    label = { Text(label) }
                )
            }
        }

        Text(
            if (selected == null) "請先選擇目的地 Please choose a destination"
            else "已選擇：${selected.id}，模式：$mode"
        )

        MapPlaceholder(Modifier.fillMaxWidth().weight(1f))
    }
}

// Temporary page. Replace it with the 3D team's page and renderMap() later.
@Composable
fun MapPlaceholder(modifier: Modifier = Modifier) {
    AndroidView(
        // Keeps the WebView inside its own area, below the controls.
        modifier = modifier.clipToBounds(),
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                loadDataWithBaseURL(
                    null,
                    "<html><body style='background:#e8eef0;text-align:center;padding-top:40px'>" +
                            "PLACEHOLDER: waiting for the 3D team's map</body></html>",
                    "text/html",
                    "UTF-8",
                    null
                )
            }
        }
    )
}
