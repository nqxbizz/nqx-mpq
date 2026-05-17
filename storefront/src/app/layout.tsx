import { getBaseURL } from "@lib/util/env"
import { getShopConfig } from "@lib/shop"
import { Metadata } from "next"
import "styles/globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const { brand, theme } = await getShopConfig()
  return {
    metadataBase: new URL(getBaseURL()),
    title: {
      default: brand?.title || brand?.name || "Shop",
      template: `%s | ${brand?.name || "Shop"}`,
    },
    description: brand?.description || "",
    icons: { icon: theme?.favicon || "/favicon.ico" },
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { theme, features } = await getShopConfig()
  const c = theme?.colors || {}

  const showcase = features?.showcaseMode !== false
  const bodyClass = [
    showcase ? "showcase" : "",
    showcase && features?.showcaseHidePrice !== false ? "hide-price" : "",
    showcase && features?.showcaseHideCart !== false ? "hide-cart" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const fontImport =
    theme?.fontImport ||
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"

  // Brand the whole UI from shop.config.json via CSS variables.
  const themeVars = `
    :root{
      --brand-primary:${c.primary || "#18181b"};
      --brand-on-primary:${c.onPrimary || "#ffffff"};
      --brand-bg:${c.background || "#ffffff"};
      --brand-fg:${c.foreground || "#0a0a0a"};
      --brand-accent:${c.accent || "#b8860b"};
      --brand-accent-dark:${c.accentDark || "#8a6608"};
      --brand-muted:${c.muted || "#f6f5f3"};
      --brand-border:${c.border || "#e7e5e1"};
      --brand-radius:${theme?.radius || "2px"};
      --brand-font:${theme?.fontSans || '"Inter", system-ui, sans-serif'};
      --brand-font-heading:${
        theme?.fontHeading || '"Playfair Display", Georgia, serif'
      };
      --brand-tracking:${theme?.letterSpacing || "0.12em"};
    }
    body{font-family:var(--brand-font);background:var(--brand-bg);color:var(--brand-fg);-webkit-font-smoothing:antialiased;}
    h1,h2,h3,h4,h5,h6{font-family:var(--brand-font-heading);}
    ${
      theme?.uppercaseHeadings
        ? "h1,h2,h3,h4,h5,h6{text-transform:uppercase;letter-spacing:var(--brand-tracking);}"
        : ""
    }
  `

  return (
    <html lang="en" data-mode="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link href={fontImport} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body className={bodyClass}>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
