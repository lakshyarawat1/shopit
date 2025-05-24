'use client'

import { useAtom } from 'jotai'
import { activeSidebarItem } from '../constants/constants';

const useSidebar = () => {
    const [activeSidebar, setActiveSidebar] = useAtom(activeSidebarItem);

  return {activeSidebar, setActiveSidebar}
}

export default useSidebar