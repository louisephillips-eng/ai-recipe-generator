// listmodels.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyAc26IOU36NpBQ6_k7izmvrp6ziBSkwgbs");

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAc26IOU36NpBQ6_k7izmvrp6ziBSkwgbs`
);
const data = await response.json();
data.models
  .filter(m => m.supportedGenerationMethods.includes("generateContent"))
  .forEach(m => console.log(m.name));