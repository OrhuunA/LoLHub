/// <reference types="vite/client" />

declare module '*.png?asset' {
    const content: string;
    export default content;
}
