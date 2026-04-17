import React from 'react'

const forumPosts = [
  { avatar: '🌶️', user: 'Maya Chen', time: '📍 Level 22 · 2 hours ago', title: 'Finally cracked the chili code — my secret to 3x the yield in a 12-inch pot 🌶️', preview: 'After 6 failed seasons, I figured out the exact soil mix and watering schedule that made all the difference. Sharing my full setup with photos and data logs...', tags: ['🌶️ Chili', 'Container Growing', 'Advanced Tips', 'High Yield'], likes: 342, replies: 89, featured: true },
  { avatar: '🥬', user: 'Arif Danial', time: 'Level 8 · 5 hours ago', title: 'Yellow leaves on my basil — anyone else seeing this after the rain?', preview: 'Woke up to three yellowing leaves on my indoor basil. Watered it 4 days ago. Soil feels slightly damp. Could this be overwatering or a nutrient issue?', tags: ['🌿 Basil', 'Help Needed'], likes: 24, replies: 31 },
  { avatar: '🥕', user: 'Priya Nair', time: 'Level 15 · Yesterday', title: 'My first real carrot harvest after 3 attempts 🥕 What a feeling!', preview: 'Third time\'s the charm. Loose sandy soil and patience was the key. Pulled 11 beautiful carrots today — sharing my full grow diary below.', tags: ['🥕 Carrots', 'First Harvest'], likes: 208, replies: 55 },
  { avatar: '🫑', user: 'Lena Müller', time: 'Level 11 · Yesterday', title: 'What crops survive a super hot apartment? (40°C+ in summer 🥵)', preview: 'Living in a top floor apartment with full sun all day in summer. Looking for heat-tolerant crops that won\'t wilt. Currently trying okra and sweet potato.', tags: ['Heat Tolerant', 'Apartment Grow'], likes: 67, replies: 42 }
]

export const Forum = () => {
  return (
    <section id="forum">
      <p className="section-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
        Community Forum
      </p>
      <h2 className="section-title">Grow together,<br />learn faster</h2>
      <p className="section-desc">Thousands of growers sharing tips, troubleshooting problems, and celebrating harvests every day.</p>

      <div className="forum-grid">
        {forumPosts.map((post, i) => (
          <div className={`forum-card ${post.featured ? 'featured' : ''}`} key={i}>
            <div className="forum-card-header">
              <div className="forum-avatar">{post.avatar}</div>
              <div>
                <p className="forum-user">{post.user}</p>
                <p className="forum-time">{post.time}</p>
              </div>
            </div>
            <h3 className="forum-title">{post.title}</h3>
            <p className="forum-preview">{post.preview}</p>
            <div className="forum-tags">
              {post.tags.map((tag, j) => (
                <span className="forum-tag" key={j}>{tag}</span>
              ))}
            </div>
            <div className="forum-footer">
              <span>❤️ {post.likes} likes</span>
              <span>💬 {post.replies} replies</span>
              <span>🔖 Save</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign:'center', marginTop:'36px'}}>
        <a href="#" className="btn-secondary">Browse All Discussions →</a>
      </div>
    </section>
  )
}
