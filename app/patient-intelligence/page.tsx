'use client'

import { useEffect, useState } from 'react'
import './patient-intelligence.css'

export default function PatientIntelligence() {
  const [heroValue, setHeroValue] = useState(0)
  const [channelsAnimated, setChannelsAnimated] = useState(false)

  useEffect(() => {
    // Animate hero value
    const finalValue = 15143
    const duration = 1500
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(finalValue * easeOutQuart)
      
      setHeroValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)

    // Trigger channel animation on scroll
    const handleScroll = () => {
      const channelSection = document.querySelector('.channel-section')
      if (channelSection) {
        const rect = channelSection.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setChannelsAnimated(true)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial position

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const stats = [
    { label: 'Total Patients', value: '50', change: '+12%', isPositive: true },
    { label: 'Top 20%', value: '10', change: '+3 new', isPositive: true },
    { label: 'Revenue Share', value: '30%', change: 'from VIPs', isPositive: false },
    { label: 'Average Value', value: '$5,048', change: '+$1,200', isPositive: true },
  ]

  const topZips = [
    { zip: '11566', patients: 4, avgValue: 5084, total: 20336 },
    { zip: '11743', patients: 4, avgValue: 4846, total: 19462 },
    { zip: '11030', patients: 1, avgValue: 5586, total: 5586 },
    { zip: '11217', patients: 2, avgValue: 3200, total: 6400 },
    { zip: '10022', patients: 3, avgValue: 2833, total: 8500 },
  ]

  const channels = [
    { name: 'Instagram', percentage: 31 },
    { name: 'Google', percentage: 28 },
    { name: 'Facebook', percentage: 20 },
    { name: 'Referral', percentage: 11 },
    { name: 'Walk-in', percentage: 10 },
  ]

  const insights = [
    {
      title: 'Revenue Concentration',
      detail: 'Top 10 patients = 30% of revenue',
      value: '$50,477'
    },
    {
      title: 'Best Location',
      detail: 'ZIP 11566 highest value',
      value: '$20,336'
    },
    {
      title: 'Top Channel',
      detail: 'Instagram delivers best ROI',
      value: '3x average'
    }
  ]

  return (
    <div className="pi-container">
      <h1>Patient Intelligence</h1>
      <p className="pi-subtitle">Clear insights to grow your practice</p>
      <p className="pi-subtitle-extended">
        Your patient data reveals hidden opportunities worth thousands in monthly revenue. 
        This dashboard analyzes your top performers, identifies patterns, and shows you exactly 
        where to focus your marketing spend for maximum ROI. Every recommendation is based on 
        your actual patient behavior and spending patterns.
      </p>

      {/* Hero Card */}
      <div className="pi-primary-card">
        <div className="pi-metric-label">
          <span className="pi-pulse-dot"></span>
          Revenue Opportunity
        </div>
        <div className="pi-metric-value">${heroValue.toLocaleString()}</div>
        <p className="pi-metric-desc">10 dormant high-value patients haven't visited in 90+ days</p>
        <button className="pi-btn">Start Reactivation Campaign</button>
        <a href="#" className="pi-btn pi-btn-secondary">Preview list</a>
      </div>

      {/* Stats Grid */}
      <div className="pi-grid">
        {stats.map((stat, i) => (
          <div key={i} className="pi-stat">
            <div className="pi-stat-label">{stat.label}</div>
            <div className="pi-stat-value">{stat.value}</div>
            <div className={`pi-stat-change ${stat.isPositive ? 'positive' : ''}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="pi-two-column">
        <div>
          {/* Top ZIPs Table */}
          <div className="pi-table-section">
            <h2 className="pi-section-title">Top Performing ZIPs</h2>
            <table className="pi-table">
              <thead>
                <tr>
                  <th>ZIP Code</th>
                  <th>Patients</th>
                  <th>Avg Value</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topZips.map((zip, i) => (
                  <tr key={i}>
                    <td>{zip.zip}</td>
                    <td>{zip.patients}</td>
                    <td>${zip.avgValue.toLocaleString()}</td>
                    <td className="pi-highlight">${zip.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pi-key-insight">
              <strong>Insight:</strong> ZIP 11566 patients spend 2x more. Focus marketing here.
            </div>
          </div>

          {/* Channels */}
          <div className="pi-table-section channel-section">
            <h2 className="pi-section-title">Marketing Channels</h2>
            <div className="pi-channel-container">
              {channels.map((channel, i) => (
                <div key={i} className="pi-channel-item">
                  <span className="pi-channel-name">{channel.name}</span>
                  <div className="pi-channel-bar">
                    <div 
                      className="pi-channel-fill"
                      style={{
                        width: channelsAnimated ? `${channel.percentage}%` : '0%',
                        transitionDelay: `${i * 100}ms`
                      }}
                    />
                  </div>
                  <span className="pi-channel-value">{channel.percentage}%</span>
                </div>
              ))}
              <div className="pi-key-insight">
                <strong>Insight:</strong> Instagram delivers 3x better ROI than Facebook. Consider shifting budget.
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Insights Sidebar */}
          <div className="pi-sidebar-card">
            <h3 className="pi-sidebar-title">Key Insights</h3>
            {insights.map((insight, i) => (
              <div key={i} className="pi-insight-item">
                <div className="pi-insight-title">{insight.title}</div>
                <div className="pi-insight-detail">{insight.detail}</div>
                <div className="pi-insight-value">{insight.value}</div>
              </div>
            ))}
          </div>

          {/* Action Card */}
          <div className="pi-sidebar-card pi-action-card">
            <h3 className="pi-sidebar-title">Recommended Action</h3>
            <p>Shift 20% of Facebook budget to Instagram based on 3x better performance</p>
            <button className="pi-btn pi-btn-white">Generate Campaign</button>
          </div>
        </div>
      </div>
    </div>
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> dababd8 (feat: Add campaign-intel API route)
