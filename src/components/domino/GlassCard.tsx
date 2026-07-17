export default function GlassCard({
children
}:{
children:React.ReactNode
}){

return(
<div className="rounded-2xl bg-white/10 backdrop-blur p-6">
{children}
</div>
);

}
