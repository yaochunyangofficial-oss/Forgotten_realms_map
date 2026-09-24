import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'DND Map / made by Martin Y / v0.2.0',description:'Storm King’s Thunder 北地戰役地圖、陣營疆界與冒險路線。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
