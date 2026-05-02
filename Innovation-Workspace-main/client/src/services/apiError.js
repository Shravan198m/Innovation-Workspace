export function getApiErrorMessage(error, fallbackMessage) {
  const responseMessage = error?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage.trim();
  }

  if (error?.message && error.message !== "Network Error") {
    return error.message;
  }

  if (error?.response?.status) {
    return `Request failed with status ${error.response.status}.`;
  }

  return fallbackMessage;
}
