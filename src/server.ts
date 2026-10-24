import "dotenv/config";
import app from "./app.ts"

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});