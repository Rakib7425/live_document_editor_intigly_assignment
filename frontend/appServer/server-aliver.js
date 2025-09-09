const backendAliver = async () => {
  try {
    const response = await fetch(
      "https://live-document-editor-intigly-assignment.onrender.com/health"
    );

    const data = await response.json();
    if (data.ok) {
      console.log(
        "https://live-document-editor-intigly-assignment.onrender.com/health API is healthy"
      );
    } else {
      console.log(
        "https://live-document-editor-intigly-assignment.onrender.com/health API is not healthy"
      );
    }
  } catch (error) {
    console.error(error);
  }
};

// Frontend appServer aliver
const frontendAliver = async () => {
  try {
    const response = await fetch(
      "https://live-document-editor-intigly-assignment-07xv.onrender.com/api/health"
    );

    const data = await response.json();

    if (data.ok) {
      console.log(
        "https://live-document-editor-intigly-assignment-07xv.onrender.com/api/health API is healthy"
      );
    } else {
      console.log(
        "https://live-document-editor-intigly-assignment-07xv.onrender.com/api/health API is not healthy"
      );
    }
  } catch (error) {
    console.error(error);
  }
};

setInterval(backendAliver, 14 * 60 * 1000); // Check every 1 minutes
setInterval(frontendAliver, 14 * 60 * 1000); // Check every 1 minutes

export { backendAliver, frontendAliver };
export default {};
