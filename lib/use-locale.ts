'use client';
import {useEffect,useState} from 'react';
import type {Place} from './types';
import {translate,placeName,type Locale} from './i18n';
export function useLocale(){const [locale,setLocale]=useState<Locale>('zh');useEffect(()=>{try{setLocale(localStorage.getItem('dnd-map.locale')==='en'?'en':'zh')}catch{}},[]);function changeLocale(value:Locale){setLocale(value);try{localStorage.setItem('dnd-map.locale',value)}catch{}}useEffect(()=>{document.documentElement.lang=locale==='en'?'en':'zh-Hant';document.title='DND Map / made by Martin Y / v0.2.0'},[locale]);return {locale,setLocale:changeLocale,tr:(text:string)=>translate(text,locale),name:(p:Pick<Place,'name'|'zh'>)=>placeName(p,locale)};}
