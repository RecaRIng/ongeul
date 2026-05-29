import ongleLogo from '../../imports/__.png';

export default function OngleHeader() {
  return (
    <header className="border-b" style={{ backgroundColor: '#f9f3ef' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-6">
          <img src={ongleLogo} alt="온글 로고" className="w-24 h-24 flex-shrink-0" style={{ background: 'transparent' }} />
          <div className="flex-1 space-y-1">
            <p className="text-base font-semibold text-gray-900">
              학교 문서, 쉽게 읽고 해낼 수 있게
            </p>
            <p className="text-sm text-gray-600">
              안내문부터 과제까지, 이해하고 따라갈 수 있도록 차근차근 도와드려요
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
