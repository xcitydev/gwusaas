import React from 'react'
import { AppSidebar } from './app-sidebar'

const SideBar = ({children}: {children: React.ReactNode}) => {
  return (
     <div className="flex min-h-screen ">
      <AppSidebar />
      <div className="flex-1">
      {children}
      </div>
    </div>
  )
}

export default SideBar
