import { io } from "socket.io-client";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const socketBase = apiBase.replace(/\/api\/?$/, "");

function getSocketToken() {
  try {
    const raw = localStorage.getItem("innovationHubAuth");
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);
    return parsed?.token || "";
  } catch {
    return "";
  }
}

const socket = io(socketBase, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  auth: (cb) => {
    cb({ token: getSocketToken() });
  },
});

export default socket;
