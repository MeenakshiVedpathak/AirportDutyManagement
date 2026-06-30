package com.airportdutymanagement

import android.app.Activity
import android.content.Intent
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class FilePicker(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "FilePicker"
        private const val REQUEST_CODE = 7741
    }

    private var promise: Promise? = null

    private val listener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, req: Int, result: Int, data: Intent?) {
            if (req != REQUEST_CODE) return
            val p = promise ?: return
            promise = null
            if (result == Activity.RESULT_OK) {
                val uri = data?.data
                if (uri == null) { p.reject("NO_URI", "No file selected"); return }

                try {
                    val context = reactApplicationContext
                    val inputStream = context.contentResolver.openInputStream(uri)
                        ?: throw Exception("Cannot open file")

                    val bytes = inputStream.readBytes()
                    inputStream.close()

                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

                    // Try to get the real filename from the content resolver
                    var fileName = "boarding-pass.pdf"
                    try {
                        val cursor = context.contentResolver.query(uri, null, null, null, null)
                        cursor?.use {
                            if (it.moveToFirst()) {
                                val nameIdx = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                                if (nameIdx >= 0) fileName = it.getString(nameIdx) ?: fileName
                            }
                        }
                    } catch (_: Exception) {}

                    val result = WritableNativeMap().apply {
                        putString("base64", base64)
                        putString("fileName", fileName)
                    }
                    p.resolve(result)
                } catch (e: Exception) {
                    p.reject("READ_ERROR", e.message ?: "Could not read file")
                }
            } else {
                p.reject("CANCELLED", "Cancelled")
            }
        }
    }

    init { reactContext.addActivityEventListener(listener) }

    override fun getName() = NAME

    @ReactMethod
    fun pickPdf(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity")
            return
        }
        this.promise = promise
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "application/pdf"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
        }
        activity.startActivityForResult(Intent.createChooser(intent, "Select PDF"), REQUEST_CODE)
    }

    @ReactMethod
    fun saveFileToCache(base64: String, filename: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val pdfDir = File(context.cacheDir, "pdfs")
            pdfDir.mkdirs()
            val file = File(pdfDir, filename.ifBlank { "document.pdf" })
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            file.writeBytes(bytes)
            promise.resolve(file.absolutePath)
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", e.message ?: "Could not save file")
        }
    }

    @ReactMethod
    fun openFile(filePath: String, mimeType: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val file = File(filePath)
            if (!file.exists()) { promise.reject("NOT_FOUND", "File not found: $filePath"); return }
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(Intent.createChooser(intent, "Open with"))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("OPEN_ERROR", e.message ?: "Could not open file")
        }
    }
}
