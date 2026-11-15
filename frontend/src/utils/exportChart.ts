export function exportChartAsPng(containerElementId: string, filename: string = "chart.png"): void {
  const container = document.getElementById(containerElementId);
  if (!container) return;

  const svgElement = container.querySelector("svg");
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const rect = svgElement.getBoundingClientRect();
    const scale = 2; // High DPI 2x
    canvas.width = (rect.width || 600) * scale;
    canvas.height = (rect.height || 300) * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill background matching dark theme
    ctx.fillStyle = "#121821";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  img.src = url;
}
