// File perantara khusus supaya batas code-splitting (dynamic import) ada di sini,
// bukan langsung di paket @techstark/opencv-js - workaround untuk bug interop
// Rolldown (bundler baru Vite 8) saat sebuah paket CJS meng-export Promise sebagai
// default export-nya langsung dari dynamic import().
import cv from '@techstark/opencv-js'

export default cv
