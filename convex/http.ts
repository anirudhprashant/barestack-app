import { httpRouter } from "convex/server";
import { auth } from "./auth.config";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
