package expo.modules.saakshievidence

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.os.Handler
import android.os.Looper
import android.util.Size
import android.view.TextureView
import android.view.ViewGroup
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/** The camera preview for CameraRecorder, filling the view (centre-cropped) in the app's portrait screen. */
class RecorderPreviewView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val texture = TextureView(context)
  private var contentSize: Size? = null
  private val main = Handler(Looper.getMainLooper())

  init {
    addView(texture, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    texture.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
      override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
        CameraRecorder.setPreview(surface) { size ->
          main.post {
            contentSize = size
            applyTransform()
          }
        }
      }

      override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) = applyTransform()

      override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
        CameraRecorder.setPreview(null)
        return true
      }

      override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit
    }
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    texture.layout(0, 0, r - l, b - t)
    applyTransform()
  }

  private fun applyTransform() {
    val size = contentSize ?: return
    val viewW = texture.width.toFloat()
    val viewH = texture.height.toFloat()
    if (viewW == 0f || viewH == 0f) return
    // The camera's landscape buffer is shown upright in portrait, so its shape is height × width.
    val contentW = size.height.toFloat()
    val contentH = size.width.toFloat()
    val scale = maxOf(viewW / contentW, viewH / contentH)
    texture.setTransform(Matrix().apply {
      setScale(contentW * scale / viewW, contentH * scale / viewH, viewW / 2, viewH / 2)
    })
  }
}
