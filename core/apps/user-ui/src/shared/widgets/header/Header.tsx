'use client';

import Link from 'next/link';
import React from 'react';
import { HeartIcon, SearchIcon, ShoppingCart, User } from 'lucide-react';
import HeaderBottom from './HeaderBottom';
// eslint-disable-next-line @nx/enforce-module-boundaries
import useUser from 'apps/user-ui/src/hooks/useUser';

const Header = () => {
  const { user, isLoading } = useUser();

  return (
    <div className="w-full bg-white">
      <div className="w-[80%] py-5 m-auto flex items-center justify-between">
        <div>
          <Link href="/">
            <span className="text-3xl font-[500]">ShopIT</span>
          </Link>
        </div>
        <div className="w-1/2 relative">
          <input
            type="text"
            placeholder="Search for products here ..."
            className="w-full px-4 h-[55px] rounded-xl font-Poppins font-medium border-[2.5px] border-[#3489FF] outline-none"
          />
          <div className="w-[60px] rounded-xl cursor-pointer flex items-center justify-center h-[55px] bg-[#3489ff] absolute top-0 right-0 hover:scale-105 duration-200">
            <SearchIcon color="white" />
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            {!isLoading && user ? (
              <>
                <Link
                  href="/profile"
                  className="border-2 w-[50px] h-[50px] flex items-center justify-center rounded-full border-[#010f1c1a]"
                >
                  <User />
                </Link>
                <Link href="/profile">
                  <span className="block font-medium">Hello,</span>
                  <span className="font-semibold">{user?.name?.split(" ")[0]}</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="border-2 w-[50px] h-[50px] flex items-center justify-center rounded-full border-[#010f1c1a]"
                >
                  <User />
                </Link>
                <Link href="/login">
                  <span className="block font-medium">Hello,</span>
                  <span className="font-semibold">{ isLoading ? "..." : "Sign In" }</span>
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/wishlist"
              className="relative hover:scale-110 duration-200"
            >
              <HeartIcon />
              <div className="w-6 h-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute -top-[10px] -right-[10px] text-white">
                <span className="text-white font-medium text-sm">0</span>
              </div>
            </Link>{' '}
            <Link
              href="/cart"
              className="relative hover:scale-110 duration-200"
            >
              <ShoppingCart />
              <div className="w-6 h-6 border-2 border-white bg-blue-500 rounded-full flex items-center justify-center absolute -top-[10px] -right-[10px] text-white">
                <span className="text-white font-medium text-sm">0</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      <div className="border-b border-b-slate-200" />
      <HeaderBottom />
    </div>
  );
};

export default Header;
