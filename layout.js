import './globals.css'

export const metadata = {
  title: 'DRYNN — Custom Print Clothing',
  description: 'Premium custom print clothing service. Upload your design, choose your garment, delivered across India.',
  keywords: 'custom print, t-shirt printing, hoodie printing, Tamil Nadu, India, custom clothing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
