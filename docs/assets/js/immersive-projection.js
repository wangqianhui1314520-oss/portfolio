// Project a readable DOM surface onto its true four-corner world quadrilateral.
// Points are ordered TL, TR, BR, BL; the projective denominator preserves tilt.
export function quadMatrix(points,width,height){
 if(points.length!==4||!points.every(p=>p.every(Number.isFinite))||width<=0||height<=0)return null;
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=points;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 let g=0,h=0;
 if(Math.abs(dx3)+Math.abs(dy3)>1e-7){const divisor=dx1*dy2-dx2*dy1;if(Math.abs(divisor)<1e-8)return null;g=(dx3*dy2-dx2*dy3)/divisor;h=(dx1*dy3-dx3*dy1)/divisor;}
 const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
 return [a/width,d/width,0,g/width,b/height,e/height,0,h/height,0,0,1,0,x0,y0,0,1];
}
export function convexHull(points){
 const sorted=points.filter(p=>p.every(Number.isFinite)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(sorted.length<3)return sorted;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];
 for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 lower.pop();upper.pop();return lower.concat(upper);
}
