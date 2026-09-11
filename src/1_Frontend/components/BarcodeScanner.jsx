import React, { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  NotFoundException,
} from "@zxing/library";

const SCAN_FPS = 15;
const SCAN_BOX_RATIO = 0.6;

function BarcodeScanner({ isOpen, onClose, onScan }) {
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);

  const stopScanner = () => {
    scanningRef.current = false;
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        // non-fatal: scanner may already be torn down
      }
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg("");
    scanningRef.current = true;

    const startScanner = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (scanningRef.current) {
          setErrorMsg("Camera access is not supported in this browser.");
        }
        return;
      }

      if (!window.isSecureContext) {
        if (scanningRef.current) {
          setErrorMsg(
            "Camera access requires a secure connection (HTTPS or localhost)."
          );
        }
        return;
      }

      const video = videoRef.current;
      if (!video) {
        if (scanningRef.current) {
          setErrorMsg("Scanner element not available.");
        }
        return;
      }

      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (cameraErr) {
        if (!scanningRef.current) return;
        if (
          cameraErr.name === "NotAllowedError" ||
          cameraErr.name === "PermissionDeniedError"
        ) {
          setErrorMsg(
            "Camera permission denied. Please allow camera access in your browser settings."
          );
          return;
        } else if (cameraErr.name === "NotFoundError") {
          setErrorMsg("No camera found on this device.");
          return;
        } else if (cameraErr.name === "NotReadableError") {
          setErrorMsg("Camera is already in use or not readable.");
          return;
        } else if (cameraErr.name === "OverconstrainedError") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" } },
            });
          } catch (fallbackErr) {
            if (!scanningRef.current) return;
              setErrorMsg(
                "Unable to access camera: " +
                  (fallbackErr?.message || String(fallbackErr))
              );
            return;
          }
        } else {
          setErrorMsg(
            "Unable to access camera: " +
              (cameraErr?.message || String(cameraErr))
          );
          return;
        }
      }

      if (!scanningRef.current) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      try {
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.applyConstraints === "function") {
          const supported = track.getCapabilities?.().focusMode || [];
          if (!supported.length || supported.includes("continuous")) {
            await track.applyConstraints({
              advanced: [{ focusMode: "continuous" }],
            });
          }
        }
      } catch (focusErr) {
        // Non-fatal: continuous focus is a best-effort enhancement.
      }

      streamRef.current = stream;

      const scanIntervalMs = Math.round(1000 / SCAN_FPS);
      const codeReader = new BrowserMultiFormatReader(
        undefined,
        scanIntervalMs
      );
      codeReader.timeBetweenDecodingAttempts = scanIntervalMs;
      codeReaderRef.current = codeReader;

      codeReader.drawFrameOnCanvas = function (srcElement, _dims, ctx) {
        const context = ctx || this.captureCanvasContext;
        const vw = srcElement.videoWidth;
        const vh = srcElement.videoHeight;
        if (!vw || !vh || !context) return;
        const boxW = Math.floor(vw * SCAN_BOX_RATIO);
        const boxH = Math.floor(vh * SCAN_BOX_RATIO);
        const sx = Math.floor((vw - boxW) / 2);
        const sy = Math.floor((vh - boxH) / 2);
        context.drawImage(srcElement, sx, sy, boxW, boxH, 0, 0, vw, vh);
      };

      const handleScanSuccess = (decodedText) => {
        if (decodedText) {
          onScan(decodedText);
          stopScanner();
          onClose();
        }
      };

      try {
        await codeReader.decodeFromStream(stream, video, (result, error) => {
          if (!scanningRef.current) return;

          if (result) {
            handleScanSuccess(result.getText().trim());
          } else if (error && !isExpectedDecodeError(error)) {
            setErrorMsg("Barcode scanning stopped unexpectedly.");
          }
        });
      } catch (decodeErr) {
        if (scanningRef.current) {
          setErrorMsg(isExpectedDecodeError(decodeErr)
            ? "No barcode detected. Try holding the camera steady."
            : "Failed to start barcode scanning. Please try again.");
        }
        stopScanner();
      }
    };

    startScanner().catch(() => {
      if (scanningRef.current) {
        setErrorMsg("Unable to start barcode scanning. Please try again.");
        stopScanner();
      }
    });

    return () => {
      stopScanner();
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div className="print:hidden modal-overlay">
      <div className="modal-content">
        <h3>Scan Barcode</h3>
        {errorMsg ? (
          <div className="scanner-error">
            <p>{errorMsg}</p>
          </div>
        ) : (
          <div
            className="scanner-video-wrap"
            style={{ position: "relative", overflow: "hidden" }}
          >
            <video
              ref={videoRef}
              className="w-full rounded-xl"
              style={{ maxWidth: "100%", height: "auto", aspectRatio: "4/3" }}
              playsInline
              muted
              autoPlay
            />
            <div
              className="scanner-box"
              style={{
                position: "absolute",
                top: `${((1 - SCAN_BOX_RATIO) / 2) * 100}%`,
                left: `${((1 - SCAN_BOX_RATIO) / 2) * 100}%`,
                width: `${SCAN_BOX_RATIO * 100}%`,
                height: `${SCAN_BOX_RATIO * 100}%`,
                border: "2px solid #22c55e",
                borderRadius: "8px",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            stopScanner();
            onClose();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function isExpectedDecodeError(error) {
  if (error instanceof NotFoundException) return true;
  const name = error?.name || error?.constructor?.name;
  return name === 'ChecksumException' || name === 'FormatException' || name === 'NotFoundException';
}

export default React.memo(BarcodeScanner);
