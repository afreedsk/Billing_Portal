// frontend/src/components/ThreeDChart.jsx
import React, { useEffect, useRef } from "react";

const COLORS = ["#2f5dd4", "#16a34a", "#d97706", "#8b5cf6", "#dc2626", "#0ea5e9"];

export default function ThreeDChart({ data }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // animate bars on mount
    const bars = containerRef.current?.querySelectorAll(".bar-3d");
    if (bars) {
      bars.forEach((bar, i) => {
        bar.style.animationDelay = `${i * 0.1}s`;
        bar.classList.add("animate");
      });
    }
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for 3D chart.</div>;
  }

  // Find max value for scaling
  const maxVal = Math.max(...data.map(d => Math.abs(d.amount)));
  const maxHeight = 150; // pixels

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        height: 220,
        padding: "20px 10px",
        perspective: "800px",
      }}
    >
      {data.map((item, index) => {
        const height = maxVal === 0 ? 10 : (Math.abs(item.amount) / maxVal) * maxHeight;
        const color = COLORS[index % COLORS.length];
        return (
          <div
            key={index}
            className="bar-3d"
            style={{
              width: 40,
              margin: "0 12px",
              transformStyle: "preserve-3d",
              transform: "rotateX(-20deg) rotateY(10deg)",
              transition: "transform 0.3s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "rotateX(-20deg) rotateY(10deg) scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "rotateX(-20deg) rotateY(10deg)";
            }}
          >
            <div
              style={{
                height: height,
                backgroundColor: color,
                width: "100%",
                transform: "translateZ(10px)",
                borderRadius: "4px 4px 0 0",
                boxShadow: "0 0 15px rgba(0,0,0,0.2)",
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                color: "#fff",
                fontSize: 12,
                fontWeight: "bold",
                paddingBottom: 4,
                transition: "height 0.6s ease",
              }}
            >
              <span style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                ₹{item.amount.toLocaleString()}
              </span>
            </div>
            {/* Top face (3D effect) */}
            <div
              style={{
                height: 10,
                width: "100%",
                backgroundColor: color,
                transform: "rotateX(90deg) translateZ(-5px) translateY(-5px)",
                transformOrigin: "bottom",
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              }}
            />
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 11,
                color: "#555",
                fontWeight: "500",
                transform: "translateZ(10px)",
              }}
            >
              {item.category.length > 12 ? item.category.slice(0, 10) + "…" : item.category}
            </div>
          </div>
        );
      })}
      <style>
        {`
          .bar-3d {
            opacity: 0;
            transform: rotateX(-20deg) rotateY(10deg) scale(0.8);
            transition: opacity 0.6s ease, transform 0.6s ease;
          }
          .bar-3d.animate {
            opacity: 1;
            transform: rotateX(-20deg) rotateY(10deg) scale(1);
            animation: popIn 0.6s ease forwards;
          }
          @keyframes popIn {
            0% { opacity: 0; transform: rotateX(-20deg) rotateY(10deg) scale(0.5); }
            100% { opacity: 1; transform: rotateX(-20deg) rotateY(10deg) scale(1); }
          }
        `}
      </style>
    </div>
  );
}