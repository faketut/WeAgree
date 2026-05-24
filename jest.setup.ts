import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";
import crypto from "node:crypto";

Object.assign(global, { TextEncoder, TextDecoder, crypto });
