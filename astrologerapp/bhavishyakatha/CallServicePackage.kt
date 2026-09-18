package com.astrologer.bhavishyakatha

import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class CallServicePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext)
    = listOf(CallServiceModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext)
    = emptyList<ViewManager<*, *>>()
}
