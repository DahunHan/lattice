# How to Record a Demo GIF for Lattice

## Quick Method (Windows)

### Option A: Windows Game Bar (built-in)
1. Open `http://localhost:3000` in your browser
2. Press `Win + G` to open Game Bar
3. Click the Record button (or press `Win + Alt + R`)
4. Perform the demo steps below
5. Press `Win + Alt + R` again to stop
6. Convert the .mp4 to .gif using https://ezgif.com/video-to-gif

### Option B: ScreenToGif (free tool)
1. Download from https://www.screentogif.com/
2. Open it, click "Recorder"
3. Position the frame over your browser
4. Record the demo steps below
5. Save directly as .gif

## Demo Steps (15-20 seconds total)

### Scene 1: Landing Page (3 seconds)
- Show the Lattice landing page with the gradient header
- Type a folder path in the input field

### Scene 2: Scan (2 seconds)
- Click "Scan"
- Show the blue scanning indicator

### Scene 3: Graph Appears (5 seconds)
- Graph renders with nodes and edges
- Show the team grouping labels (Dev, Growth)
- Hover over an agent to show the glow effect

### Scene 4: Click Agent (5 seconds)
- Click an agent node
- Detail panel slides in from the right
- Show health dot, git info, instructions

### Scene 5: Toggle Live (3 seconds)
- Click the "Monitor" button
- Show agents with status indicators

## After Recording

1. Save as `docs/demo.gif` in the project
2. Update README.md — replace the screenshot placeholder:
   ```markdown
   ![Lattice Dashboard](docs/demo.gif)
   ```
3. Keep it under 5MB for GitHub rendering
4. Optimize at https://ezgif.com/optimize if needed

## Recommended Settings
- Resolution: 1280x720 or 1920x1080
- Frame rate: 15 fps (enough for UI demo)
- Duration: 15-20 seconds max
- Browser: Chrome or Edge (best font rendering)
