// TypeScript shim declarations to avoid deep lib type-check recursion
// (Workaround for occasional typescript-go incremental compiler stack overflow in this environment)

declare module "html2canvas" {
  const html2canvas: any;
  export default html2canvas;
}

declare module "@capacitor/share" {
  export const Share: any;
}

declare module "@capacitor/filesystem" {
  export const Filesystem: any;
  export const Directory: any;
}
