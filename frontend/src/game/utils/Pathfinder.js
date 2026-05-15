import Phaser from 'phaser';

export default class Pathfinder {
    constructor(scene, tilemap, platformLayer) {
        this.scene = scene;
        this.tilemap = tilemap;
        this.platformLayer = platformLayer;
        
        // Grid setup
        this.gridWidth = tilemap.width;
        this.gridHeight = tilemap.height;
        this.tileSize = tilemap.tileWidth;
        
        // Cache the collision grid to avoid repeated expensive getTileAt calls
        this.collisionGrid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.collisionGrid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                const tile = tilemap.getTileAt(x, y, true, platformLayer);
                // A tile is passable if it's empty or doesn't have collision enabled
                this.collisionGrid[y][x] = (tile && tile.canCollide) ? 1 : 0;
            }
        }
    }

    // A* Pathfinding implementation
    findPath(startX, startY, endX, endY) {
        // Convert world coordinates to tile coordinates
        const start = {
            x: Math.floor(startX / this.tileSize),
            y: Math.floor(startY / this.tileSize)
        };
        const end = {
            x: Math.floor(endX / this.tileSize),
            y: Math.floor(endY / this.tileSize)
        };

        // Basic bounds checking
        if (start.x < 0 || start.x >= this.gridWidth || start.y < 0 || start.y >= this.gridHeight ||
            end.x < 0 || end.x >= this.gridWidth || end.y < 0 || end.y >= this.gridHeight) {
            return null;
        }

        // Standard A* algorithm
        const openList = [];
        const closedSet = new Set();
        
        const startNode = {
            x: start.x,
            y: start.y,
            g: 0,
            h: this.heuristic(start, end),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;
        openList.push(startNode);

        const startTime = performance.now();
        const maxTime = 15; // Max 15ms per calculation to prevent frame drops

        while (openList.length > 0) {
            // Check performance limit
            if (performance.now() - startTime > maxTime) return null;

            // Get node with lowest F score
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) currentIndex = i;
            }
            const current = openList[currentIndex];

            // Target reached?
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(current);
            }

            // Move to closed set
            openList.splice(currentIndex, 1);
            closedSet.add(`${current.x},${current.y}`);

            // Check neighbors (including diagonals)
            const neighbors = [
                { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
            ];

            for (const offset of neighbors) {
                const nx = current.x + offset.x;
                const ny = current.y + offset.y;

                // Valid neighbor?
                if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) continue;
                if (this.collisionGrid[ny][nx] === 1) continue;
                if (closedSet.has(`${nx},${ny}`)) continue;

                // Check for diagonal "cutting" through corners
                if (offset.x !== 0 && offset.y !== 0) {
                    if (this.collisionGrid[current.y][nx] === 1 && this.collisionGrid[ny][current.x] === 1) continue;
                }

                const gScore = current.g + (offset.x !== 0 && offset.y !== 0 ? 1.4 : 1);
                
                let neighborNode = openList.find(n => n.x === nx && n.y === ny);

                if (!neighborNode) {
                    neighborNode = {
                        x: nx,
                        y: ny,
                        g: gScore,
                        h: this.heuristic({ x: nx, y: ny }, end),
                        parent: current
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openList.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }

        return null; // No path found
    }

    heuristic(a, b) {
        // Octile distance for 8-way movement
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        return (dx + dy) + (1.4 - 2) * Math.min(dx, dy);
    }

    reconstructPath(node) {
        const path = [];
        let curr = node;
        while (curr) {
            path.push({
                x: curr.x * this.tileSize + this.tileSize / 2,
                y: curr.y * this.tileSize + this.tileSize / 2
            });
            curr = curr.parent;
        }
        return path.reverse();
    }
}
