// Vercel's Node runtime calls the default export with (req, res), which an Express app already
// matches - no adapter needed. vercel.json rewrites every request to this one function.
import { createApp } from "../src/app.js";

export default createApp();
