package com.snsrk9.astrocristoptec

import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class NotificationServicePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext)
    = listOf(NotificationServiceModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext)
    = emptyList<ViewManager<*, *>>()
}
