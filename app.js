// Global variables
let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordedVideoBlob = null;
let frames = [];
let recordingTimer = null;
let recordingStartTime = null;
const MAX_RECORDING_TIME = 30000; // 30 seconds in milliseconds

// DOM elements
const videoPreview = document.getElementById('videoPreview');
const recordedVideo = document.getElementById('recordedVideo');
const startCameraBtn = document.getElementById('startCameraBtn');
const startRecordingBtn = document.getElementById('startRecordingBtn');
const stopRecordingBtn = document.getElementById('stopRecordingBtn');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const recordedSection = document.getElementById('recordedSection');
const resultSection = document.getElementById('resultSection');
const processingStatus = document.getElementById('processingStatus');
const statusText = document.getElementById('statusText');
const progressFill = document.getElementById('progressFill');
const recordingIndicator = document.getElementById('recordingIndicator');
const timer = document.getElementById('timer');
const panoramaCanvas = document.getElementById('panoramaCanvas');
const framesSection = document.getElementById('framesSection');
const framesGallery = document.getElementById('framesGallery');
const frameCount = document.getElementById('frameCount');
const videoInfo = document.getElementById('videoInfo');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');

// Start camera
startCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        
        videoPreview.srcObject = stream;
        startCameraBtn.classList.add('hidden');
        startRecordingBtn.classList.remove('hidden');
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera. Please ensure you have granted camera permissions.');
    }
});

// Start recording
startRecordingBtn.addEventListener('click', () => {
    recordedChunks = [];
    frames = []; // Clear previous frames
    framesSection.classList.add('hidden'); // Hide frames section
    
    // Try different codecs for better compatibility
    const options = [
        { mimeType: 'video/webm;codecs=vp9' },
        { mimeType: 'video/webm;codecs=vp8' },
        { mimeType: 'video/webm' },
        { mimeType: 'video/mp4' }
    ];
    
    let recorderCreated = false;
    for (const option of options) {
        try {
            if (MediaRecorder.isTypeSupported(option.mimeType)) {
                mediaRecorder = new MediaRecorder(stream, option);
                console.log('Using codec:', option.mimeType);
                recorderCreated = true;
                break;
            }
        } catch (e) {
            continue;
        }
    }
    
    if (!recorderCreated) {
        try {
            mediaRecorder = new MediaRecorder(stream);
            console.log('Using default MediaRecorder');
        } catch (e) {
            alert('MediaRecorder is not supported in this browser.');
            return;
        }
    }
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = async () => {
        if (recordedChunks.length === 0) {
            alert('No video data recorded. Please try again.');
            return;
        }
        
        // Determine the correct MIME type from the recorder
        const mimeType = mediaRecorder.mimeType || 'video/webm';
        console.log('Recording MIME type:', mimeType);
        
        // Create video blob with correct type
        recordedVideoBlob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(recordedVideoBlob);
        
        // Set video source
        recordedVideo.src = url;
        recordedVideo.muted = false;
        recordedVideo.controls = true;
        
        // Add error handling for video playback
        recordedVideo.onerror = (e) => {
            console.error('Video playback error:', e);
            videoInfo.textContent = 'Error: Video cannot be played. The video was recorded but may have compatibility issues.';
        };
        
        recordedVideo.onloadeddata = () => {
            console.log('Video data loaded successfully');
        };
        
        // Show video section
        recordedSection.classList.remove('hidden');
        
        // Wait for video metadata to load
        await new Promise((resolve) => {
            const onLoadedMetadata = () => {
                recordedVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
                const duration = recordedVideo.duration;
                const sizeMB = (recordedVideoBlob.size / (1024 * 1024)).toFixed(2);
                videoInfo.textContent = `Duration: ${duration.toFixed(2)}s | Size: ${sizeMB} MB | Resolution: ${recordedVideo.videoWidth}x${recordedVideo.videoHeight}`;
                resolve();
            };
            
            recordedVideo.addEventListener('loadedmetadata', onLoadedMetadata);
            recordedVideo.load();
            
            // Fallback timeout
            setTimeout(() => {
                if (recordedVideo.readyState >= 1) {
                    const duration = recordedVideo.duration || 0;
                    const sizeMB = (recordedVideoBlob.size / (1024 * 1024)).toFixed(2);
                    videoInfo.textContent = `Duration: ${duration.toFixed(2)}s | Size: ${sizeMB} MB`;
                    resolve();
                }
            }, 2000);
        });
        
        // Show process button
        processBtn.classList.remove('hidden');
        
        // Automatically extract frames after video is ready
        processingStatus.classList.remove('hidden');
        statusText.textContent = 'Extracting frames from video...';
        progressFill.style.width = '0%';
        
        try {
            await extractFrames(recordedVideo);
            displayFrames();
            processingStatus.classList.add('hidden');
        } catch (error) {
            console.error('Error extracting frames:', error);
            statusText.textContent = 'Error: ' + error.message;
            setTimeout(() => {
                processingStatus.classList.add('hidden');
            }, 3000);
        }
    };
    
    mediaRecorder.start();
    startRecordingBtn.classList.add('hidden');
    stopRecordingBtn.classList.remove('hidden');
    recordingIndicator.classList.remove('hidden');
    
    // Start timer
    recordingStartTime = Date.now();
    updateTimer();
    recordingTimer = setInterval(updateTimer, 100);
    
    // Auto-stop after 30 seconds
    setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        }
    }, MAX_RECORDING_TIME);
});

// Update recording timer
function updateTimer() {
    if (!recordingStartTime) return;
    
    const elapsed = Date.now() - recordingStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    
    timer.textContent = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
    
    if (elapsed >= MAX_RECORDING_TIME) {
        clearInterval(recordingTimer);
    }
}

// Stop recording
stopRecordingBtn.addEventListener('click', stopRecording);

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    stopRecordingBtn.classList.add('hidden');
    recordingIndicator.classList.add('hidden');
    clearInterval(recordingTimer);
}

// Extract frames from video
async function extractFrames(videoElement) {
    return new Promise((resolve, reject) => {
        frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Check if video has valid dimensions
        if (!videoElement.videoWidth || !videoElement.videoHeight) {
            // Wait for metadata if not loaded
            const onLoadedMetadata = () => {
                videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                startExtraction();
            };
            
            videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
            videoElement.load();
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (frames.length === 0) {
                    reject(new Error('Video failed to load. Please try recording again.'));
                }
            }, 5000);
        } else {
            startExtraction();
        }
        
        function startExtraction() {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            const duration = videoElement.duration;
            
            if (!duration || duration === 0 || !isFinite(duration)) {
                reject(new Error('Invalid video duration. Please record a valid video.'));
                return;
            }
            
            const fps = 30; // Extract frames at 30fps
            const frameInterval = 1 / fps;
            const totalFrames = Math.ceil(duration * fps);
            
            if (totalFrames === 0) {
                reject(new Error('Video has no frames. Please record a longer video.'));
                return;
            }
            
            let currentTime = 0;
            let frameCount = 0;
            let seekTimeout;
            
            function extractFrame() {
                if (currentTime >= duration) {
                    clearTimeout(seekTimeout);
                    resolve(frames);
                    return;
                }
                
                videoElement.currentTime = currentTime;
                
                // Timeout for seek operation (in case video is stuck)
                clearTimeout(seekTimeout);
                seekTimeout = setTimeout(() => {
                    console.warn('Seek timeout, continuing...');
                    currentTime += frameInterval;
                    extractFrame();
                }, 2000);
            }
            
            const onSeeked = () => {
                try {
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    const imageData = canvas.toDataURL('image/jpeg', 0.95);
                    frames.push({
                        imageData: imageData,
                        canvas: canvas,
                        time: currentTime
                    });
                    
                    frameCount++;
                    const progress = 10 + (frameCount / totalFrames) * 50; // 10-60% of progress
                    progressFill.style.width = `${progress}%`;
                    statusText.textContent = `Extracting frames: ${frameCount}/${totalFrames}`;
                    
                    clearTimeout(seekTimeout);
                    currentTime += frameInterval;
                    extractFrame();
                } catch (error) {
                    console.error('Error extracting frame:', error);
                    clearTimeout(seekTimeout);
                    currentTime += frameInterval;
                    extractFrame();
                }
            };
            
            videoElement.addEventListener('seeked', onSeeked);
            
            // Start extraction
            extractFrame();
        }
    });
}

// Feature detection using Harris corner detection
function detectFeatures(imageData, width, height) {
    const gray = grayscale(imageData, width, height);
    const corners = [];
    const threshold = 1000000;
    
    // Harris corner detection
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const Ix = gray[(y * width + x + 1)] - gray[(y * width + x - 1)];
            const Iy = gray[((y + 1) * width + x)] - gray[((y - 1) * width + x)];
            
            const Ixx = Ix * Ix;
            const Iyy = Iy * Iy;
            const Ixy = Ix * Iy;
            
            // Sum over a window (simplified)
            let Sxx = 0, Syy = 0, Sxy = 0;
            const windowSize = 3;
            
            for (let dy = -windowSize; dy <= windowSize; dy++) {
                for (let dx = -windowSize; dx <= windowSize; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        Sxx += Ixx;
                        Syy += Iyy;
                        Sxy += Ixy;
                    }
                }
            }
            
            const det = Sxx * Syy - Sxy * Sxy;
            const trace = Sxx + Syy;
            const response = det - 0.04 * trace * trace;
            
            if (response > threshold) {
                corners.push({ x, y, response });
            }
        }
    }
    
    // Sort by response and take top features
    corners.sort((a, b) => b.response - a.response);
    return corners.slice(0, 500); // Top 500 features
}

// Convert image to grayscale
function grayscale(imageData, width, height) {
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    return gray;
}

// Match features between two frames
function matchFeatures(features1, features2, imageData1, imageData2, width, height) {
    const matches = [];
    const windowSize = 8;
    
    for (const feat1 of features1.slice(0, 100)) { // Limit for performance
        let bestMatch = null;
        let bestDistance = Infinity;
        
        for (const feat2 of features2.slice(0, 100)) {
            // Calculate descriptor distance (simplified)
            const distance = Math.sqrt(
                Math.pow(feat1.x - feat2.x, 2) + 
                Math.pow(feat1.y - feat2.y, 2)
            );
            
            if (distance < bestDistance && distance < 50) {
                bestDistance = distance;
                bestMatch = feat2;
            }
        }
        
        if (bestMatch) {
            matches.push({
                p1: { x: feat1.x, y: feat1.y },
                p2: { x: bestMatch.x, y: bestMatch.y }
            });
        }
    }
    
    return matches;
}

// Calculate homography matrix using RANSAC
function calculateHomography(matches) {
    if (matches.length < 4) return null;
    
    // Simplified homography calculation
    // In production, use a proper RANSAC implementation
    const srcPoints = matches.map(m => [m.p1.x, m.p1.y]);
    const dstPoints = matches.map(m => [m.p2.x, m.p2.y]);
    
    // Use first 4 matches for initial homography
    const h = computeHomographyMatrix(srcPoints.slice(0, 4), dstPoints.slice(0, 4));
    return h;
}

// Compute homography matrix from 4 point correspondences
function computeHomographyMatrix(srcPoints, dstPoints) {
    const A = [];
    
    for (let i = 0; i < 4; i++) {
        const [x, y] = srcPoints[i];
        const [u, v] = dstPoints[i];
        
        A.push([-x, -y, -1, 0, 0, 0, x * u, y * u, u]);
        A.push([0, 0, 0, -x, -y, -1, x * v, y * v, v]);
    }
    
    // Solve using SVD (simplified - in production use proper matrix library)
    // For now, return identity matrix as fallback
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
}

// Warp image using homography
function warpImage(imageData, homography, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // Wider canvas for panorama
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const outputData = ctx.createImageData(canvas.width, canvas.height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Apply homography transformation
            const [hx, hy, hw] = applyHomography(x, y, homography);
            const nx = hx / hw;
            const ny = hy / hw;
            
            if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < height) {
                const srcIdx = (y * width + x) * 4;
                const dstIdx = (Math.floor(ny) * canvas.width + Math.floor(nx)) * 4;
                
                if (dstIdx >= 0 && dstIdx < outputData.data.length - 3) {
                    outputData.data[dstIdx] = imageData.data[srcIdx];
                    outputData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
                    outputData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
                    outputData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
                }
            }
        }
    }
    
    ctx.putImageData(outputData, 0, 0);
    return canvas;
}

function applyHomography(x, y, h) {
    return [
        h[0][0] * x + h[0][1] * y + h[0][2],
        h[1][0] * x + h[1][1] * y + h[1][2],
        h[2][0] * x + h[2][1] * y + h[2][2]
    ];
}

// Template matching to find overlap between frames
function findOverlap(img1, img2, width, height) {
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    canvas1.width = canvas2.width = width;
    canvas1.height = canvas2.height = height;
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    
    ctx1.drawImage(img1, 0, 0);
    ctx2.drawImage(img2, 0, 0);
    
    const data1 = ctx1.getImageData(0, 0, width, height);
    const data2 = ctx2.getImageData(0, 0, width, height);
    
    // Extract right edge of img1 and left edge of img2
    const templateWidth = Math.floor(width * 0.15); // 15% of width
    const templateHeight = height;
    
    let bestMatch = 0;
    let bestScore = Infinity;
    
    // Search for best match in the overlap region
    for (let offset = 0; offset < templateWidth * 2; offset++) {
        let score = 0;
        let count = 0;
        
        for (let y = 0; y < templateHeight; y++) {
            for (let x = 0; x < templateWidth; x++) {
                const x1 = width - templateWidth + x;
                const x2 = x + offset;
                
                if (x2 < width) {
                    const idx1 = (y * width + x1) * 4;
                    const idx2 = (y * width + x2) * 4;
                    
                    // Calculate difference
                    const rDiff = data1.data[idx1] - data2.data[idx2];
                    const gDiff = data1.data[idx1 + 1] - data2.data[idx1 + 1];
                    const bDiff = data1.data[idx1 + 2] - data2.data[idx1 + 2];
                    
                    score += Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
                    count++;
                }
            }
        }
        
        score = score / count;
        if (score < bestScore) {
            bestScore = score;
            bestMatch = offset;
        }
    }
    
    return width - templateWidth - bestMatch;
}

// Create panorama using improved technique
async function createPanorama() {
    // Check if frames are already extracted
    if (frames.length === 0) {
        // Check if video is available
        if (!recordedVideoBlob || !recordedVideo.src) {
            alert('Please record a video first before creating a 360° image.');
            return;
        }
        
        processingStatus.classList.remove('hidden');
        statusText.textContent = 'Loading video...';
        progressFill.style.width = '0%';
        
        try {
            // Ensure video is loaded and ready
            if (recordedVideo.readyState < 2) {
                statusText.textContent = 'Waiting for video to load...';
                await new Promise((resolve) => {
                    recordedVideo.addEventListener('loadedmetadata', resolve, { once: true });
                    recordedVideo.load();
                });
            }
            
            // Wait a bit more to ensure video is fully ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            statusText.textContent = 'Extracting frames...';
            progressFill.style.width = '10%';
            
            // Extract frames
            await extractFrames(recordedVideo);
            displayFrames();
            
            if (frames.length === 0) {
                throw new Error('No frames extracted from video. Please ensure the video is valid and has content.');
            }
        } catch (error) {
            console.error('Error extracting frames:', error);
            alert('Error extracting frames: ' + error.message);
            processingStatus.classList.add('hidden');
            return;
        }
    }
    
    processingStatus.classList.remove('hidden');
    statusText.textContent = 'Creating panorama...';
    progressFill.style.width = '60%';
    
    try {
        if (frames.length === 0) {
            throw new Error('No frames available. Please record and extract frames first.');
        }
        
        statusText.textContent = 'Analyzing frame overlaps...';
        progressFill.style.width = '60%';
        
        const frameWidth = frames[0].canvas.width;
        const frameHeight = frames[0].canvas.height;
        
        // Load all images first
        const images = [];
        for (let i = 0; i < frames.length; i++) {
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = frames[i].imageData;
            });
            images.push(img);
        }
        
        // Find overlaps between consecutive frames using template matching
        const overlaps = [];
        for (let i = 0; i < images.length - 1; i++) {
            statusText.textContent = `Finding overlap: ${i + 1}/${images.length - 1}`;
            const overlap = findOverlap(images[i], images[i + 1], frameWidth, frameHeight);
            overlaps.push(overlap);
        }
        
        // Calculate total width based on actual overlaps
        let totalWidth = frameWidth;
        for (let i = 0; i < overlaps.length; i++) {
            totalWidth += frameWidth - overlaps[i];
        }
        
        statusText.textContent = 'Stitching panorama...';
        progressFill.style.width = '75%';
        
        // Create panorama canvas
        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw first frame
        ctx.drawImage(images[0], 0, 0);
        let currentX = frameWidth;
        
        // Draw subsequent frames with proper alignment and blending
        for (let i = 1; i < images.length; i++) {
            const overlap = overlaps[i - 1];
            const xPos = currentX - overlap;
            
            // Draw new frame
            ctx.globalAlpha = 1.0;
            ctx.drawImage(images[i], xPos, 0);
            
            // Blend overlap region for smooth transition
            if (overlap > 0) {
                const blendWidth = Math.min(overlap, frameWidth * 0.2);
                const blendStart = xPos;
                const blendEnd = blendStart + blendWidth;
                
                // Create gradient mask for blending
                const existingData = ctx.getImageData(blendStart, 0, blendWidth, frameHeight);
                const newData = ctx.getImageData(blendStart, 0, blendWidth, frameHeight);
                
                for (let x = 0; x < blendWidth; x++) {
                    const alpha = x / blendWidth;
                    for (let y = 0; y < frameHeight; y++) {
                        const idx = (y * blendWidth + x) * 4;
                        existingData.data[idx] = existingData.data[idx] * (1 - alpha) + newData.data[idx] * alpha;
                        existingData.data[idx + 1] = existingData.data[idx + 1] * (1 - alpha) + newData.data[idx + 1] * alpha;
                        existingData.data[idx + 2] = existingData.data[idx + 2] * (1 - alpha) + newData.data[idx + 2] * alpha;
                    }
                }
                
                ctx.putImageData(existingData, blendStart, 0);
            }
            
            currentX = xPos + frameWidth;
            
            const progress = 75 + (i / images.length) * 20;
            progressFill.style.width = `${progress}%`;
            statusText.textContent = `Stitching frames: ${i + 1}/${images.length}`;
        }
        
        // Apply cylindrical projection for 360° effect
        progressFill.style.width = '95%';
        statusText.textContent = 'Applying 360° projection...';
        
        const cylindricalCanvas = applyCylindricalProjection(canvas, frameHeight);
        
        // Display result
        panoramaCanvas.width = cylindricalCanvas.width;
        panoramaCanvas.height = cylindricalCanvas.height;
        const panoramaCtx = panoramaCanvas.getContext('2d');
        panoramaCtx.drawImage(cylindricalCanvas, 0, 0);
        
        progressFill.style.width = '100%';
        statusText.textContent = 'Complete!';
        
        setTimeout(() => {
            processingStatus.classList.add('hidden');
            resultSection.classList.remove('hidden');
        }, 1000);
        
    } catch (error) {
        console.error('Error creating panorama:', error);
        alert('Error creating panorama: ' + error.message);
        processingStatus.classList.add('hidden');
    }
}

// Apply cylindrical projection for 360° panorama
function applyCylindricalProjection(sourceCanvas, height) {
    const sourceCtx = sourceCanvas.getContext('2d');
    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;
    
    // Output canvas with same aspect ratio
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceWidth;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext('2d');
    
    const sourceData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
    const outputData = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);
    
    const f = sourceWidth / (2 * Math.PI); // Focal length
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < sourceWidth; x++) {
            // Cylindrical projection
            const theta = (x - sourceWidth / 2) / f;
            const srcX = Math.round(sourceWidth / 2 + f * Math.tan(theta));
            const srcY = Math.round((y - height / 2) * Math.sqrt(1 + Math.tan(theta) * Math.tan(theta)) + sourceHeight / 2);
            
            if (srcX >= 0 && srcX < sourceWidth && srcY >= 0 && srcY < sourceHeight) {
                const srcIdx = (srcY * sourceWidth + srcX) * 4;
                const dstIdx = (y * sourceWidth + x) * 4;
                
                outputData.data[dstIdx] = sourceData.data[srcIdx];
                outputData.data[dstIdx + 1] = sourceData.data[srcIdx + 1];
                outputData.data[dstIdx + 2] = sourceData.data[srcIdx + 2];
                outputData.data[dstIdx + 3] = sourceData.data[srcIdx + 3];
            }
        }
    }
    
    outputCtx.putImageData(outputData, 0, 0);
    return outputCanvas;
}

// Process button click
processBtn.addEventListener('click', createPanorama);

// Display extracted frames in gallery
function displayFrames() {
    if (frames.length === 0) {
        framesSection.classList.add('hidden');
        return;
    }
    
    framesGallery.innerHTML = '';
    frameCount.textContent = `(${frames.length} frames)`;
    
    frames.forEach((frame, index) => {
        const frameItem = document.createElement('div');
        frameItem.className = 'frame-item';
        
        const img = document.createElement('img');
        img.src = frame.imageData;
        img.alt = `Frame ${index + 1}`;
        img.loading = 'lazy';
        
        const frameNumber = document.createElement('div');
        frameNumber.className = 'frame-number';
        frameNumber.textContent = `Frame ${index + 1} (${frame.time.toFixed(2)}s)`;
        
        frameItem.appendChild(img);
        frameItem.appendChild(frameNumber);
        framesGallery.appendChild(frameItem);
    });
    
    framesSection.classList.remove('hidden');
}

// Download video button
downloadVideoBtn.addEventListener('click', () => {
    if (!recordedVideoBlob) {
        alert('No video available to download.');
        return;
    }
    
    const link = document.createElement('a');
    link.download = 'recorded-video-' + Date.now() + '.webm';
    link.href = URL.createObjectURL(recordedVideoBlob);
    link.click();
    
    // Clean up the URL after a delay
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
    }, 100);
});

// Download panorama button
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = '360-panorama-' + Date.now() + '.png';
    link.href = panoramaCanvas.toDataURL('image/png');
    link.click();
});

