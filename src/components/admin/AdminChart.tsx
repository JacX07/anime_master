"use client";

import { useEffect, useRef } from "react";
import { BarController, BarElement, CategoryScale, Chart, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = ["#c0a361", "#7f9696", "#8ca68d", "#b8715f", "#8f86b0", "#c3a565"];

export interface ChartSet { label: string; values: number[] }

/** Courbe ou barres (empilées au besoin) sur fond sombre ; `summary` décrit le graphique pour les lecteurs d'écran. */
export function AdminChart({ type, labels, sets, stacked = false, summary, height = 220 }: {
  type: "line" | "bar";
  labels: string[];
  sets: ChartSet[];
  stacked?: boolean;
  summary: string;
  height?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([type, labels, sets, stacked]);
  useEffect(() => {
    if (!canvas.current) return;
    const chart = new Chart(canvas.current, {
      type,
      data: {
        labels,
        datasets: sets.map((s, i) => ({
          label: s.label, data: s.values, borderColor: COLORS[i % COLORS.length], backgroundColor: COLORS[i % COLORS.length] + (type === "bar" ? "cc" : "33"),
          tension: 0.25, pointRadius: labels.length > 40 ? 0 : 2, borderWidth: 2, fill: false,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: sets.length > 1, labels: { color: "#a8ada6", boxWidth: 10 } } },
        scales: {
          x: { stacked, ticks: { color: "#8c918b", maxTicksLimit: 10 }, grid: { display: false } },
          y: { stacked, beginAtZero: true, ticks: { color: "#8c918b", precision: 0 }, grid: { color: "#ffffff12" } },
        },
      },
    });
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div className="adm-chart" style={{ height }}><canvas ref={canvas} role="img" aria-label={summary} /></div>;
}
