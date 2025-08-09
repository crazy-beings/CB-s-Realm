document.addEventListener("DOMContentLoaded", () => {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const spot = document.createElement("div");
    spot.className = "bg-light-spot";
    document.body.appendChild(spot);
  }
});
