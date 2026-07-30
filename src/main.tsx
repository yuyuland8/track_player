import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

/** 画框固定 375×812；窗口更小时整体等比缩小，保证内容永不被裁切 */
const FRAME_W = 375;
const FRAME_H = 812;

function fitFrame() {
  const scale = Math.min(
    1,
    window.innerWidth / FRAME_W,
    window.innerHeight / FRAME_H,
  );
  document.documentElement.style.setProperty("--frame-scale", String(scale));
}

fitFrame();
window.addEventListener("resize", fitFrame);
window.addEventListener("orientationchange", fitFrame);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
