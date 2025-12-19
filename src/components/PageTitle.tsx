import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-slate-300 mt-1">{subtitle}</p>
    </div>
  );
};

export default PageTitle;
