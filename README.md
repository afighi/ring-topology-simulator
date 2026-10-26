# Token Ring Topology Simulator

An interactive, browser-based simulation of a Local Area Network (LAN) operating on the IEEE 802.5 Token Ring protocol. This application models token passing, frame transmission, node addressing, fault detection, and connection recovery in real time using HTML5 Canvas and vanilla JavaScript.

Developed as an academic school project during my 2nd year of college for basic networking, and featured on my portfolio at [https://ardg.vercel.app/](https://ardg.vercel.app/).

---

## Academic Background

This simulator was conceptualized and built during my sophomore (2nd) year in college as part of a computer networking curriculum. The primary goal of the project was to create an educational, visual tool that accurately demonstrates the operational mechanics and fault-tolerance behavior of ring topologies.

While modern enterprise networks predominantly rely on switched Ethernet, the Token Ring protocol remains a fundamental concept in networking theory, illustrating deterministic medium access control (MAC), token-passing ring architecture, and token arbitration without data collisions.

---

## Key Features

- Real-Time Token Passing Simulation:
  - Visualizes free token circulation around the ring.
  - Simulates token capture, frame encapsulation (Source IP, Destination IP, Data payload), station address matching, frame copying, acknowledgment (ACK) generation, and token release.

- Interactive Node Management:
  - Dynamically add up to 12 station nodes (PCs) to the ring.
  - Remove active nodes with automatic connection restructuring (minimum 2 nodes required).
  - Toggle individual station power (online/offline) to observe network degradation and bypass behavior.

- Network Fault & Failure Injection:
  - Click any individual transmission segment/link directly on the canvas to simulate physical link severing.
  - "Break All" control to simulate catastrophic network partition.
  - "Restart All" recovery control to restore connections and bring offline stations back online.

- Live Activity Logging:
  - Color-coded event log tracking token states, frame delivery, node additions, errors, and disconnections.
  - Filterable interface with clear log functionality.

- Network Statistics & Diagnostics:
  - Live counters for Total PCs, Online PCs, Offline Active PCs, Manually Broken Connections, Data Transmissions, Acknowledgments, Removed PCs, and Token Status.

- Responsive Retro Arcade Aesthetic:
  - Custom canvas graphics, retro typography, and a floating collapsible HUD control panel.
  - Built-in interactive instruction modal explaining Token Ring fundamentals.

---

## Token Ring Protocol Mechanics

The simulator models the classic IEEE 802.5 Token Ring protocol:

1. Free Token State:
   A special control frame (the token) circulates continuously around the ring in a unidirectional path.

2. Frame Transmission:
   When a source station wishes to transmit data, it waits until it receives a free token. The station alters the token state to busy and appends the source IP, destination IP, and payload data.

3. Station Inspection:
   As the frame circulates, intermediate nodes inspect the destination address:
   - If the address does not match, the node regenerates and forwards the frame to the next downstream neighbor.
   - If the destination matches, the receiving station copies the frame into its buffer and sets an acknowledgment flag.

4. Acknowledgment & Token Release:
   The frame continues back to the original transmitting station. Upon receiving the frame with the acknowledgment flag, the transmitting station strips the data from the ring and releases a new free token for other stations to capture.

5. Fault Handling:
   If a physical link breaks or a station fails, token circulation halts until connections are restored, demonstrating the vulnerability and maintenance requirements of traditional ring topologies.

---

## Tech Stack

- Structure: HTML5 (Semantic elements, Canvas API)
- Styling: Vanilla CSS3 (Custom HUD panels, retro layout, modal overlays)
- Logic: Vanilla JavaScript (ES6+), HTML5 2D Canvas rendering engine
- Fonts: Google Fonts (Press Start 2P, Montserrat)
- Dependencies: None (Zero runtime or build dependencies)

---

## Project Structure

```text
ring-topology-simulator/
|-- images/
|   |-- ardg.png              # Developer branding badge
|   |-- emblem.png            # Application insignia
|   |-- off.png               # Node offline indicator
|   |-- on.png                # Node online indicator
|   |-- retro.png             # UI design asset
|   |-- sysunit.png           # PC node canvas graphic
|-- emblem.ico                # Application favicon
|-- index.html                # Main application markup & HUD layout
|-- script.js                 # Canvas animation, topology math & network logic
|-- styles.css                # Visual design, animations, and HUD styling
|-- .gitignore                # Git ignore configuration
`-- README.md                 # Project documentation
```

---

## Getting Started

Because this project is built entirely with client-side vanilla web standards, it requires no installation, compilers, or package managers.

### Option 1: Open Directly in Browser

1. Clone or download the repository:
   ```bash
   git clone https://github.com/afighi/ring-topology-simulator.git
   ```
2. Navigate into the project folder:
   ```bash
   cd ring-topology-simulator
   ```
3. Open `index.html` in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).

### Option 2: Run with a Local Web Server

Using Python:
```bash
# Python 3.x
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

Using Node.js (npx):
```bash
npx serve .
```

---

## Controls and Usage

- Add PC: Click the "Add Node" button in the HUD control panel.
- Remove PC: Click the remove button next to any node in the Network Status list.
- Power Toggle: Click the power button next to any PC in the list to switch it between online and offline.
- Break Link: Click directly on any colored line connecting two PCs on the canvas.
- Transmit Data:
  1. Select a Source PC from the dropdown.
  2. Select a Destination PC from the dropdown.
  3. Click "Send Node" to initiate transmission.
  4. Observe the data packet and acknowledgment token cycle around the ring.
- Reset Network: Use "Break All" or "Restart All" to test fault tolerance and recovery.

---

## Author & Portfolio

- Author: afighi (ARDG)
- Portfolio: [https://ardg.vercel.app/](https://ardg.vercel.app/)
- GitHub: [https://github.com/afighi](https://github.com/afighi)
- Repository: [https://github.com/afighi/ring-topology-simulator](https://github.com/afighi/ring-topology-simulator)

---

## License

This project is open-source and available under the MIT License.
