"use client";

import { useState, useEffect } from "react";
import { getTodayCount, getDailyLimit, getRemainingToday } from "@/lib/storage";

export default function PricingPage() {
  const [todayCount, setTodayCount] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setTodayCount(getTodayCount());
    setRemaining(getRemainingToday());
  }, []);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "26px", marginBottom: "8px" }}>요금제</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
          오늘 {todayCount}/{getDailyLimit()} 문제 사용
          {remaining === 0 && <span style={{ color: "var(--red)", fontWeight: 600 }}> (일일 한도 도달)</span>}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        {/* Free */}
        <PlanCard
          name="무료"
          price="0"
          period=""
          features={[
            `하루 ${getDailyLimit()}문제`,
            "객관식/주관식",
            "해설 제공",
            "학습 기록",
          ]}
          cta="현재 플랜"
          ctaDisabled
          highlight={false}
        />

        {/* Basic */}
        <PlanCard
          name="베이직"
          price="9,900"
          period="/월"
          features={[
            "하루 50문제",
            "모의고사 모드",
            "오답노트",
            "취약점 분석",
            "북마크 무제한",
          ]}
          cta="곧 출시 예정"
          ctaDisabled
          highlight
        />

        {/* Pro */}
        <PlanCard
          name="프로"
          price="19,900"
          period="/월"
          features={[
            "무제한 문제",
            "모의고사 무제한",
            "AI 맞춤 추천",
            "기출 분석 리포트",
            "전과목 집중 분석",
            "우선 응답",
          ]}
          cta="곧 출시 예정"
          ctaDisabled
          highlight={false}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: "30px", color: "var(--text-muted)", fontSize: "14px" }}>
        <p>결제 시스템은 준비 중입니다.</p>
        <p>출시 알림을 받으시려면 문의해주세요.</p>
      </div>
    </div>
  );
}

function PlanCard({
  name, price, period, features, cta, ctaDisabled, highlight,
}: {
  name: string; price: string; period: string; features: string[];
  cta: string; ctaDisabled: boolean; highlight: boolean;
}) {
  return (
    <div className="card" style={{
      textAlign: "center",
      border: highlight ? "2px solid var(--blue)" : "1px solid var(--border)",
      position: "relative",
    }}>
      {highlight && (
        <div style={{
          position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
          background: "var(--blue)", color: "#fff", fontSize: "11px", fontWeight: 700,
          padding: "2px 12px", borderRadius: "10px",
        }}>
          추천
        </div>
      )}

      <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", marginTop: "8px" }}>{name}</div>
      <div style={{ marginBottom: "16px" }}>
        <span style={{ fontSize: "28px", fontWeight: 700 }}>{price}</span>
        <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>원{period}</span>
      </div>

      <ul style={{ listStyle: "none", padding: 0, marginBottom: "20px", fontSize: "13px", lineHeight: "2" }}>
        {features.map((f) => (
          <li key={f} style={{ color: "var(--text-muted)" }}>&#10003; {f}</li>
        ))}
      </ul>

      <button className={`btn btn-full btn-sm ${highlight ? "btn-blue" : "btn-outline"}`} disabled={ctaDisabled}
        style={{ opacity: ctaDisabled ? 0.6 : 1 }}>
        {cta}
      </button>
    </div>
  );
}
