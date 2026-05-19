package com.airportdutymanagement

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*

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
                if (uri != null) p.resolve(uri.toString())
                else p.reject("NO_URI", "No file selected")
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
}
