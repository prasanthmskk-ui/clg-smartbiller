import React, { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  NotFoundException,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

// Mobile performance optimized
const SCAN_FPS = 10;
const SCAN_BOX_RATIO = 0.6;

function BarcodeScanner({ isOpen, onClose, onScan }) {
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);

  // Keep latest callbacks without restarting scanner
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stopScanner = () => {
    scanningRef.current = false;

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        // Scanner may already be stopped
      }

      codeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // non-fatal
        }
      });

      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    setErrorMsg("");
    scanningRef.current = true;

    const startScanner = async () => {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setErrorMsg(
          "Camera access is not supported in this browser."
        );
        return;
      }

      if (!window.isSecureContext) {
        setErrorMsg(
          "Camera access requires a secure connection (HTTPS or localhost)."
        );
        return;
      }

      const video = videoRef.current;

      if (!video) {
        setErrorMsg("Scanner element not available.");
        return;
      }

      /*
       * Mobile optimized camera settings.
       *
       * 640x480 is much lighter than 1280x720
       * and is normally enough for barcode scanning.
       */
      const constraints = {
        audio: false,
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 640,
            max: 1280,
          },
          height: {
            ideal: 480,
            max: 720,
          },
          frameRate: {
            ideal: 24,
            max: 30,
          },
        },
      };

      let stream;

      try {
        stream =
          await navigator.mediaDevices.getUserMedia(
            constraints
          );
      } catch (cameraErr) {
        if (cancelled || !scanningRef.current) return;

        if (
          cameraErr.name === "NotAllowedError" ||
          cameraErr.name === "PermissionDeniedError"
        ) {
          setErrorMsg(
            "Camera permission denied. Please allow camera access in your browser settings."
          );
          return;
        }

        if (cameraErr.name === "NotFoundError") {
          setErrorMsg("No camera found on this device.");
          return;
        }

        if (cameraErr.name === "NotReadableError") {
          setErrorMsg(
            "Camera is already in use or not readable."
          );
          return;
        }

        // Simple fallback
        try {
          stream =
            await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                facingMode: {
                  ideal: "environment",
                },
              },
            });
        } catch (fallbackErr) {
          if (cancelled || !scanningRef.current) return;

          setErrorMsg(
            "Unable to access camera: " +
              (fallbackErr?.message ||
                String(fallbackErr))
          );
          return;
        }
      }

      if (
        cancelled ||
        !scanningRef.current
      ) {
        stream?.getTracks().forEach((track) =>
          track.stop()
        );
        return;
      }

      streamRef.current = stream;

      /*
       * Continuous autofocus.
       * Do NOT wait unnecessarily if the device doesn't support it.
       */
      try {
        const track = stream.getVideoTracks()[0];

        if (
          track &&
          typeof track.getCapabilities === "function" &&
          typeof track.applyConstraints === "function"
        ) {
          const capabilities =
            track.getCapabilities();

          if (
            capabilities?.focusMode?.includes(
              "continuous"
            )
          ) {
            track
              .applyConstraints({
                advanced: [
                  {
                    focusMode: "continuous",
                  },
                ],
              })
              .catch(() => {});
          }
        }
      } catch (focusErr) {
        // Autofocus is optional
      }

      /*
       * Scan only common billing barcode formats.
       *
       * This is considerably faster than checking
       * every possible barcode format.
       */
      const hints = new Map();

      hints.set(
        DecodeHintType.POSSIBLE_FORMATS,
        [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
        ]
      );

      const scanIntervalMs =
        Math.round(1000 / SCAN_FPS);

      const codeReader =
        new BrowserMultiFormatReader(
          hints,
          scanIntervalMs
        );

      codeReader.timeBetweenDecodingAttempts =
        scanIntervalMs;

      codeReaderRef.current = codeReader;

      /*
       * Prevent duplicate callbacks.
       *
       * Sometimes mobile cameras decode the same barcode
       * multiple times very quickly.
       */
      let lastDecodedText = "";
      let lastDecodedAt = 0;

      const handleScanSuccess = (decodedText) => {
        const text = decodedText?.trim();

        if (!text) return;

        const now = Date.now();

        // Ignore duplicate result within 1.5 seconds
        if (
          text === lastDecodedText &&
          now - lastDecodedAt < 1500
        ) {
          return;
        }

        lastDecodedText = text;
        lastDecodedAt = now;

        // Stop immediately before calling product logic
        scanningRef.current = false;

        try {
          codeReader.reset();
        } catch (e) {
          // non-fatal
        }

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => {
              try {
                track.stop();
              } catch (e) {}
            });

          streamRef.current = null;
        }

        /*
         * Call parent immediately.
         * No artificial delay.
         */
        onScanRef.current?.(text);

        onCloseRef.current?.();
      };

      try {
        await codeReader.decodeFromStream(
          stream,
          video,
          (result, error) => {
            if (
              cancelled ||
              !scanningRef.current
            ) {
              return;
            }

            if (result) {
              handleScanSuccess(
                result.getText()
              );
              return;
            }

            /*
             * NotFound / checksum / format errors
             * are normal during continuous scanning.
             */
            if (
              error &&
              !isExpectedDecodeError(error)
            ) {
              console.warn(
                "Barcode scanner:",
                error
              );
            }
          }
        );
      } catch (decodeErr) {
        if (
          cancelled ||
          !scanningRef.current
        ) {
          return;
        }

        setErrorMsg(
          isExpectedDecodeError(decodeErr)
            ? "No barcode detected. Try holding the camera steady."
            : "Failed to start barcode scanning. Please try again."
        );

        stopScanner();
      }
    };

    startScanner().catch((err) => {
      if (
        !cancelled &&
        scanningRef.current
      ) {
        console.error(
          "Scanner start error:",
          err
        );

        setErrorMsg(
          "Unable to start barcode scanning. Please try again."
        );

        stopScanner();
      }
    });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen]);

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
            style={{
              position: "relative",
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              className="w-full rounded-xl"
              style={{
                maxWidth: "100%",
                height: "auto",
                aspectRatio: "4/3",
              }}
              playsInline
              muted
              autoPlay
            />

            <div
              className="scanner-box"
              style={{
                position: "absolute",
                top: `${
                  ((1 - SCAN_BOX_RATIO) / 2) *
                  100
                }%`,
                left: `${
                  ((1 - SCAN_BOX_RATIO) / 2) *
                  100
                }%`,
                width: `${
                  SCAN_BOX_RATIO * 100
                }%`,
                height: `${
                  SCAN_BOX_RATIO * 100
                }%`,
                border:
                  "2px solid #22c55e",
                borderRadius: "8px",
                boxShadow:
                  "0 0 0 9999px rgba(0,0,0,0.35)",
                pointerEvents: "none",
              }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            stopScanner();
            onCloseRef.current?.();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function isExpectedDecodeError(error) {
  if (error instanceof NotFoundException) {
    return true;
  }

  const name =
    error?.name ||
    error?.constructor?.name;

  return (
    name === "ChecksumException" ||
    name === "FormatException" ||
    name === "NotFoundException"
  );
}

export default React.memo(BarcodeScanner);