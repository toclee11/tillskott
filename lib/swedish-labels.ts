import type { EvidenceQuality, ReviewStatus } from "@/lib/types";

export function categoryToSwedish(category: "vitamin" | "mineral" | "supplement") {
  switch (category) {
    case "vitamin":
      return "Vitamin";
    case "mineral":
      return "Mineral";
    case "supplement":
      return "Kosttillskott";
  }
}

export function evidenceQualityToSwedish(quality: EvidenceQuality) {
  switch (quality) {
    case "high":
      return "Hög";
    case "moderate":
      return "Måttlig";
    case "low":
      return "Låg";
    case "very_low":
      return "Mycket låg";
  }
}

export function reviewStatusToSwedish(status: ReviewStatus) {
  switch (status) {
    case "pending":
      return "Inväntar granskning";
    case "approved":
      return "Godkänd";
    case "rejected":
      return "Avvisad";
  }
}

