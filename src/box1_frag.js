
const box1_frag = /* glsl */`
uniform vec2 size;
uniform vec2 touchSize;
uniform float pixelSize;
uniform vec3 mouse;
uniform sampler2D tLUT;
uniform sampler2D tFrameBuffer;
varying vec2 vUv;

float lutPixelWidth = 1000.0;
float ATTENUATION = 0.007;

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float radDist(vec2 p1, vec2 p2){
    // SQRT ( (X2-X1)^2+(Y2-Y1)^2))
    return sqrt(pow(p2.x - p1.x, 2.0) + pow(p2.y - p1.y,2.0));
}

//src: https://gist.github.com/yiwenl/745bfea7f04c456e0101
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 colorDodgeBlend(vec4 input1, vec4 input2) {
    vec4 result;
    result.r = (input1.r == 1.0) ? 1.0 : min(1.0, input2.r / (1.0 - input1.r));
    result.g = (input1.g == 1.0) ? 1.0 : min(1.0, input2.g / (1.0 - input1.g));
    result.b = (input1.b == 1.0) ? 1.0 : min(1.0, input2.b / (1.0 - input1.b));
    result.a = input1.a * input2.a + (1.0 - input1.a) * input2.a;
    return result;
}

void main() {
    //mouse pos
    vec2 mouseNorm = vec2(
        map(mouse.x, -size.x/2.0, size.x/2.0, 0.0, 1.0),
        map(mouse.y, size.y/2.0, -size.y/2.0, 0.0, 1.0)
    );

    // size of touch radius
    vec2 touchSizeNorm = vec2(
        1.0 / size.x * touchSize.x,
        1.0 / size.y * touchSize.y
    );

    vec2 p = vec2(floor(gl_FragCoord.x), floor(gl_FragCoord.y));
    vec2 pNorm = vec2(
        map(p.x, 0.0, size.x, 0.0, 1.0),
        map(p.y, 0.0, size.y, 1.0, 0.0)
    );

    vec2 dist = vec2(
        abs(mouseNorm.x - pNorm.x),
        abs(mouseNorm.y - pNorm.y)
    );

    float distRad = map(radDist(mouseNorm, pNorm),0.0, 1.0/pixelSize, 0.0,1.0);

    vec2 uv = gl_FragCoord.xy / size.xy;
    // vec3 col = texture2D(tLUT, lutPos).xyz;
    // vec3 col = vec3(red,0.0,0.0);

    //HSV COLOR
    // vec3 col = hsv2rgb(vec3(map(distRad,1.0,0.0,0.2,0.0), 1.0,1.0));

    // float size_b = 0.05;
    float size_b = touchSizeNorm.x;
    float size_g = touchSizeNorm.x * 0.4;
    float size_r = touchSizeNorm.x;
    float b = map(distRad, 0.0, size_b, 0.6, 0.0);
    float g = map(distRad, 0.0, size_g, 0.6, 0.0);
    float r = map(distRad, 0.0, size_r, 0.0, 0.01);

    vec3 col = vec3(r,g,b);

    vec4 lastFrameCol = texture2D(tFrameBuffer, uv);
    lastFrameCol -= ATTENUATION;
    lastFrameCol.r = 1.0;
    // lastFrameCol.r -= 0.01;

    vec4 outCol;
    //vec4 outCol = vec4(mix(vec3(1.0,0.0,1.0), lastFrameCol.rgb, 0.9), 1.0);


    if(distRad > 0.05) {
        outCol.a = 0.0;
        outCol = lastFrameCol;
    } else {
        // outCol = vec4(
        //         hsv2rgb(
        //             vec3(
        //                 0.9,
        //                 map(distRad, 0.0, 0.1, 0.0, 1.0),
        //                 1.0
        //             )
        //         ),
        //         1.0
        // );
        // if(distRad < 0.05){
        //     float saturationRange = map(distRad, 0.0, 0.05, 0.0,0.0);
        //     outCol = vec4(hsv2rgb(vec3(0.85,saturationRange,1.0)),1.0);
        // }else {
            outCol = vec4(1.0,0.0,1.0,1.0);
        // }
        outCol = colorDodgeBlend(outCol, lastFrameCol);

    }

    gl_FragColor = vec4(outCol);
}`;
export default box1_frag; 