const { createCanvas } = require('canvas');

function generateBase64Cover(letter) {
    const colors = ['#4caf50', '#2196f3', '#f44336', '#ff9800', '#9c27b0']; 
    const randomColor = colors[Math.floor(Math.random() * colors.length)]; 

    const canvas = createCanvas(512, 512); 
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = randomColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 256px Arial';
    ctx.fillStyle = '#ffffff'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(letter, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png'); 
}

module.exports = generateBase64Cover;
