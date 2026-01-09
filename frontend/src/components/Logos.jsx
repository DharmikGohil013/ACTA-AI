import React from 'react';

export const ZoomLogo = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 11.6C2 8.23969 2 6.55953 2.65396 5.27606C3.2292 4.14708 4.14708 3.2292 5.27606 2.65396C6.55953 2 8.23969 2 11.6 2H20.4C23.7603 2 25.4405 2 26.7239 2.65396C27.8529 3.2292 28.7708 4.14708 29.346 5.27606C30 6.55953 30 8.23969 30 11.6V20.4C30 23.7603 30 25.4405 29.346 26.7239C28.7708 27.8529 27.8529 28.7708 26.7239 29.346C25.4405 30 23.7603 30 20.4 30H11.6C8.23969 30 6.55953 30 5.27606 29.346C4.14708 28.7708 3.2292 27.8529 2.65396 11.6Z" fill="#2D8CFF" />
        <path d="M4.5 13.5C4.5 13.5 5.5 10.5 8.5 10.5C11.5 10.5 11.5 13.5 11.5 13.5L12.5 10.5H16.5L13.5 19H17.5L18.5 15.5H22.5L20.5 22.5H15.5L14.5 25.5H10.5L12.5 19H8.5L6.5 25.5H2.5L4.5 13.5Z" fill="white" />
    </svg>
);

export const TeamsLogo = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.5 12C17.5 15.0376 15.0376 17.5 12 17.5C8.96243 17.5 6.5 15.0376 6.5 12C6.5 8.96243 8.96243 6.5 12 6.5C15.0376 6.5 17.5 8.96243 17.5 12Z" fill="#5059C9" />
        <rect x="2" y="5" width="20" height="14" rx="2" fill="#6264A7" fillOpacity="0.2" />
        <path fill="#5059C9" d="M21.2 5h-10l-1.6 3.2L8 5H2.8C2.3 5 2 5.3 2 5.8v12.4c0 .4.3.8.8.8h18.4c.4 0 .8-.3.8-.8V5.8c0-.4-.3-.8-.8-.8z" />
        <path fill="#FFF" d="M16 13h-1.5v3.5h-1.8V13H11v-1.8h1.8V7.8h1.8v3.5H16V13z" />
        <path fill="#C8C9E6" d="M8.2 16.5h-1.9v-2.1h1.9v2.1zm2.8-5h-1.9V9.4h1.9v2.1zm-4.7 0H4.4V9.4h1.9v2.1z" />
    </svg>
);

export const MeetLogo = ({ className = "w-8 h-8" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM18 13L15 11.23V14H8V8H15V10.77L18 9V13Z" fill="#00AC47" />
        <path fill="#EA4335" d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 20.3L12 2Z" fillOpacity="0" />
        {/* Using a simplified colored version for now to ensure it renders something recognizable if paths are complex */}
        <circle cx="12" cy="12" r="10" fill="white" />
        <path d="M6 10.5v3c0 .83.67 1.5 1.5 1.5h6c.83 0 1.5-.67 1.5-1.5v-3c0-.83-.67-1.5-1.5-1.5h-6c-.83 0-1.5.67-1.5 1.5z" fill="#00832d" />
        <path d="M15 13.5l3.5 2.5v-8L15 10.5v3z" fill="#006622" />
        <path d="M6 10.5V14H3V8h3v2.5z" fill="#00ac47" />
        <path d="M13.5 9H15v6h-1.5z" fill="#00ac47" />
    </svg>
);
