# 360° Panorama Creator

A web application that captures video from your device's camera and creates a stunning 360-degree panoramic image from the extracted frames.

## Features

- 📹 **Camera Access**: Direct access to device camera with modern WebRTC API
- ⏱️ **Video Recording**: Record videos up to 30 seconds maximum
- 🎬 **Frame Extraction**: Automatically extracts frames from recorded video at 30fps
- 🌐 **360° Panorama**: Creates a panoramic image using advanced image stitching techniques
- 💾 **Download**: Download your created 360° panorama as a PNG image

## How to Use

1. **Open the Application**: Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)

2. **Start Camera**: Click the "Start Camera" button to access your device's camera

3. **Record Video**: 
   - Click "Start Recording" to begin recording
   - Slowly pan your camera horizontally (left to right or right to left) for best results
   - Recording automatically stops after 30 seconds, or click "Stop Recording" manually

4. **Create Panorama**: 
   - Click "Create 360° Image" to process the video
   - The application will extract frames and stitch them together
   - Wait for processing to complete

5. **Download**: Click "Download 360° Image" to save your panorama

## Tips for Best Results

- **Slow Movement**: Move the camera slowly and steadily while recording
- **Horizontal Pan**: Pan horizontally (left to right or right to left) for best panorama results
- **Good Lighting**: Ensure adequate lighting for better feature detection
- **Stable Hands**: Keep the camera as stable as possible during recording
- **Overlap**: Make sure consecutive frames have some overlap for better stitching

## Technical Details

### Technologies Used
- **HTML5**: Structure and video elements
- **CSS3**: Modern, responsive styling with gradients and animations
- **JavaScript**: 
  - WebRTC API for camera access
  - MediaRecorder API for video recording
  - Canvas API for frame extraction and image processing
  - Custom panorama stitching algorithm

### Panorama Creation Technique

The application uses a multi-step process:

1. **Frame Extraction**: Extracts frames from the video at 30fps
2. **Horizontal Stitching**: Aligns frames horizontally with alpha blending for smooth transitions
3. **Cylindrical Projection**: Applies cylindrical projection to create the 360° effect
4. **Image Blending**: Uses gradient blending at frame boundaries for seamless transitions

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

**Note**: Requires HTTPS or localhost for camera access in most browsers.

## File Structure

```
lastVide360/
├── index.html      # Main HTML file
├── styles.css      # Styling and layout
├── app.js          # Main application logic
└── README.md       # This file
```

## Future Enhancements

Potential improvements:
- Advanced feature matching (SIFT/SURF)
- Automatic exposure correction
- Vertical panorama support
- Real-time preview during recording
- Multiple panorama projection options

## License

This project is open source and available for personal and commercial use.

