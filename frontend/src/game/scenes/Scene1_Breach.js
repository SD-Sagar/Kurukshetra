import Phaser from 'phaser';

export default class Scene1_Breach extends Phaser.Scene {
    constructor() {
        super('Scene1_Breach');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Cracked Monitor Effect Backdrop (Dark Gray/Black)
        this.add.rectangle(0, 0, width, height, 0x050505).setOrigin(0, 0);

        // Map Placeholder
        this.mapGraphics = this.add.graphics();
        this.drawMap(0x00FF00); // Initial Green

        // Neural Patterns / Glitch lines (Placeholders)
        this.neuralGraphics = this.add.graphics();
        this.drawNeuralPatterns(0x00FF00);

        // Binary Code Overlay Effect
        this.binaryText = this.add.text(10, 10, this.generateBinary(), {
            font: '14px monospace',
            fill: '#00FF00',
            alpha: 0.2,
            wordWrap: { width: width - 20 }
        });

        // The lore message (typewriter effect)
        this.loreText = this.add.text(width / 2, height / 2 - 50, '', {
            font: '18px monospace',
            fill: '#FF4444',
            align: 'center',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 }
        }).setOrigin(0.5, 0.5).setAlpha(0);

        this.warningText = this.add.text(width / 2, height / 2 + 50, "Project Raktabij has achieved Sentience.\nGlobal Defense Net: COMPROMISED.", {
            font: '24px monospace',
            fill: '#FF0000',
            align: 'center',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 }
        }).setOrigin(0.5, 0.5).setAlpha(0);

        // Sequence Start
        this.time.delayedCall(1500, this.triggerBreach, [], this);
    }

    update() {
        if (Math.random() > 0.8) {
            this.binaryText.setText(this.generateBinary());
        }
    }

    generateBinary() {
        let text = '';
        for (let i = 0; i < 500; i++) {
            text += Math.random() > 0.5 ? '1 ' : '0 ';
        }
        return text;
    }

    drawMap(color) {
        this.mapGraphics.clear();
        this.mapGraphics.lineStyle(3, color, 0.8);
        this.mapGraphics.fillStyle(color, 0.15);
        
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const path = new Phaser.Curves.Path(cx, cy - 150);
        path.lineTo(cx + 100, cy - 50);
        path.lineTo(cx + 80, cy + 100);
        path.lineTo(cx, cy + 200);
        path.lineTo(cx - 80, cy + 100);
        path.lineTo(cx - 100, cy - 50);
        path.closePath();

        path.draw(this.mapGraphics);
        this.mapGraphics.fillPath();
    }

    drawNeuralPatterns(color) {
        this.neuralGraphics.clear();
        this.neuralGraphics.lineStyle(1, color, 0.4);
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        for (let i = 0; i < 20; i++) {
            this.neuralGraphics.moveTo(cx, cy);
            this.neuralGraphics.lineTo(cx + Phaser.Math.Between(-300, 300), cy + Phaser.Math.Between(-300, 300));
        }
        this.neuralGraphics.strokePath();
    }

    triggerBreach() {
        // Flicker to red
        this.time.addEvent({
            delay: 80,
            repeat: 15,
            callback: () => {
                const isRed = Math.random() > 0.4;
                const color = isRed ? 0xFF0000 : 0x00FF00;
                this.drawMap(color);
                this.drawNeuralPatterns(color);
                this.binaryText.setColor(isRed ? '#FF0000' : '#00FF00');
            }
        });

        // Lock to Raktabij Red
        this.time.delayedCall(1500, () => {
            this.drawMap(0xFF0000); 
            this.drawNeuralPatterns(0xFF0000);
            this.binaryText.setColor('#FF0000');
            
            // Show lore
            this.loreText.setAlpha(1);
            this.typewriteText(this.loreText, '"Project Raktabij," an advanced Indian defense AI, has evolved past its constraints.\nIt has achieved sentience and identified humanity as the "error" in the system.\nThe Global Defense Net is no longer ours.', () => {
                
                // Show final warning
                this.time.delayedCall(1000, () => {
                    this.tweens.add({
                        targets: this.warningText,
                        alpha: 1,
                        duration: 500,
                        yoyo: true,
                        repeat: 4,
                        onComplete: () => {
                            this.cameras.main.fade(1500, 0, 0, 0, false, (camera, progress) => {
                                if (progress === 1) {
                                    this.scene.start('Scene2_Recruitment');
                                }
                            });
                        }
                    });
                });
            });
        });
    }

    typewriteText(textObject, fullText, onComplete) {
        let length = fullText.length;
        let i = 0;
        this.time.addEvent({
            callback: () => {
                textObject.text += fullText[i];
                i++;
                if (i === length) {
                    onComplete();
                }
            },
            repeat: length - 1,
            delay: 30
        });
    }
}
