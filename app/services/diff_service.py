import json
import re
from typing import Any

from deepdiff import DeepDiff


def _json_equal(left: Any, right: Any) -> bool:
    return json.dumps(left, sort_keys=True, default=str) == json.dumps(right, sort_keys=True, default=str)


def compare_object_maps(old_map, new_map, category, base_path, severity="medium"):
    changes = []
    old_obj = old_map or {}
    new_obj = new_map or {}
    all_keys = set(old_obj.keys()) | set(new_obj.keys())

    for key in all_keys:
        has_old = key in old_obj
        has_new = key in new_obj
        old_value = old_obj.get(key)
        new_value = new_obj.get(key)

        if not has_old and has_new:
            changes.append({
                "type": "added",
                "category": category,
                "path": base_path,
                "field": key,
                "oldValue": None,
                "newValue": new_value,
                "description": f"{category} 추가: {key}",
                "severity": severity,
            })
        elif has_old and not has_new:
            changes.append({
                "type": "removed",
                "category": category,
                "path": base_path,
                "field": key,
                "oldValue": old_value,
                "newValue": None,
                "description": f"{category} 삭제: {key}",
                "severity": severity,
            })
        elif has_old and has_new:
            if not _json_equal(old_value, new_value):
                changes.append({
                    "type": "modified",
                    "category": category,
                    "path": base_path,
                    "field": key,
                    "oldValue": old_value,
                    "newValue": new_value,
                    "description": f"{category} 수정: {key}",
                    "severity": severity,
                })

    return changes


def compare_arrays(old_arr, new_arr, category, path, key_field=None, severity="medium"):
    changes = []
    old_array = old_arr or []
    new_array = new_arr or []

    if key_field:
        old_by_key = {item.get(key_field): item for item in old_array}
        new_by_key = {item.get(key_field): item for item in new_array}

        for key, item in new_by_key.items():
            if key not in old_by_key:
                changes.append({
                    "type": "added",
                    "category": category,
                    "path": path,
                    "field": key,
                    "oldValue": None,
                    "newValue": item,
                    "description": f"{category} 추가: {key}",
                    "severity": severity,
                })

        for key, item in old_by_key.items():
            if key not in new_by_key:
                changes.append({
                    "type": "removed",
                    "category": category,
                    "path": path,
                    "field": key,
                    "oldValue": item,
                    "newValue": None,
                    "description": f"{category} 삭제: {key}",
                    "severity": severity,
                })

        for key, new_item in new_by_key.items():
            old_item = old_by_key.get(key)
            if old_item is not None and not _json_equal(old_item, new_item):
                changes.append({
                    "type": "modified",
                    "category": category,
                    "path": path,
                    "field": key,
                    "oldValue": old_item,
                    "newValue": new_item,
                    "description": f"{category} 수정: {key}",
                    "severity": severity,
                })
    else:
        if not _json_equal(old_array, new_array):
            changes.append({
                "type": "modified",
                "category": category,
                "path": path,
                "field": None,
                "oldValue": old_array,
                "newValue": new_array,
                "description": f"{category} 변경",
                "severity": severity,
            })

    return changes


def compare_values(old_value, new_value, category, path, field, description, severity="low"):
    changes = []

    old_exists = old_value is not None
    new_exists = new_value is not None

    if not old_exists and new_exists:
        changes.append({
            "type": "added",
            "category": category,
            "path": path,
            "field": field,
            "oldValue": None,
            "newValue": new_value,
            "description": f"{description} 추가",
            "severity": severity,
        })
    elif old_exists and not new_exists:
        changes.append({
            "type": "removed",
            "category": category,
            "path": path,
            "field": field,
            "oldValue": old_value,
            "newValue": None,
            "description": f"{description} 삭제",
            "severity": severity,
        })
    elif old_exists and new_exists:
        if not _json_equal(old_value, new_value):
            changes.append({
                "type": "modified",
                "category": category,
                "path": path,
                "field": field,
                "oldValue": old_value,
                "newValue": new_value,
                "description": f"{description} 변경",
                "severity": severity,
            })

    return changes


# Root-level comparisons

def compare_servers(old_servers, new_servers):
    return compare_arrays(old_servers, new_servers, "server", "servers", "url", "medium")


def compare_security(old_security, new_security, path="security"):
    changes = []
    old_arr = old_security or []
    new_arr = new_security or []

    if not _json_equal(old_arr, new_arr):
        changes.append({
            "type": "modified",
            "category": "security",
            "path": path,
            "field": None,
            "oldValue": old_arr,
            "newValue": new_arr,
            "description": "보안 요구사항 변경",
            "severity": "high",
        })

    return changes


def compare_tags(old_tags, new_tags):
    return compare_arrays(old_tags, new_tags, "tag", "tags", "name", "low")


def compare_external_docs(old_docs, new_docs, path="externalDocs"):
    return compare_values(old_docs, new_docs, "externalDocs", path, "externalDocs", "외부 문서", "low")


def compare_info(old_info, new_info):
    changes = []
    old = old_info or {}
    new_i = new_info or {}

    info_fields = ["title", "description", "termsOfService", "version"]
    for field in info_fields:
        changes.extend(
            compare_values(
                old.get(field),
                new_i.get(field),
                "info",
                "info",
                field,
                _info_field_description(field),
                "low",
            )
        )

    if not _json_equal(old.get("contact", {}), new_i.get("contact", {})):
        changes.append({
            "type": "modified",
            "category": "info",
            "path": "info",
            "field": "contact",
            "oldValue": old.get("contact"),
            "newValue": new_i.get("contact"),
            "description": "연락처 정보 변경",
            "severity": "low",
        })

    if not _json_equal(old.get("license", {}), new_i.get("license", {})):
        changes.append({
            "type": "modified",
            "category": "info",
            "path": "info",
            "field": "license",
            "oldValue": old.get("license"),
            "newValue": new_i.get("license"),
            "description": "라이선스 정보 변경",
            "severity": "low",
        })

    return changes


def _info_field_description(field):
    descriptions = {
        "title": "API 제목",
        "description": "API 설명",
        "termsOfService": "서비스 약관",
        "version": "API 버전",
    }
    return descriptions.get(field, field)


# Components

def compare_components(old_components, new_components):
    changes = []
    old_comp = old_components or {}
    new_comp = new_components or {}

    changes.extend(compare_object_maps(old_comp.get("schemas"), new_comp.get("schemas"), "schema", "components/schemas", "medium"))
    changes.extend(compare_object_maps(old_comp.get("securitySchemes"), new_comp.get("securitySchemes"), "securityScheme", "components/securitySchemes", "high"))
    changes.extend(compare_object_maps(old_comp.get("parameters"), new_comp.get("parameters"), "parameter", "components/parameters", "medium"))
    changes.extend(compare_object_maps(old_comp.get("requestBodies"), new_comp.get("requestBodies"), "requestBody", "components/requestBodies", "medium"))
    changes.extend(compare_object_maps(old_comp.get("responses"), new_comp.get("responses"), "response", "components/responses", "medium"))
    changes.extend(compare_object_maps(old_comp.get("headers"), new_comp.get("headers"), "header", "components/headers", "low"))
    changes.extend(compare_object_maps(old_comp.get("examples"), new_comp.get("examples"), "example", "components/examples", "low"))
    changes.extend(compare_object_maps(old_comp.get("links"), new_comp.get("links"), "link", "components/links", "low"))
    changes.extend(compare_object_maps(old_comp.get("callbacks"), new_comp.get("callbacks"), "callback", "components/callbacks", "medium"))

    return changes


# Path normalization

def normalize_path_key(path: str):
    version_pattern = r"^(.*?)(/v\d+)(/.*)?$"
    match = re.match(version_pattern, path, flags=re.IGNORECASE)

    if match:
        prefix = match.group(1) or ""
        version = match.group(2)
        rest = match.group(3) or ""
        return {
            "normalizedPath": f"{prefix}/{{VERSION}}{rest}",
            "versionPrefix": version.lower(),
            "originalPath": path,
        }

    return {
        "normalizedPath": path,
        "versionPrefix": None,
        "originalPath": path,
    }


def build_path_mapping(old_paths, new_paths):
    old_p = old_paths or {}
    new_p = new_paths or {}

    old_by_normalized = {}
    for path, spec in old_p.items():
        normalized = normalize_path_key(path)
        old_by_normalized.setdefault(normalized["normalizedPath"], {})[normalized["versionPrefix"]] = {
            "originalPath": path,
            "versionPrefix": normalized["versionPrefix"],
            "spec": spec,
        }

    new_by_normalized = {}
    for path, spec in new_p.items():
        normalized = normalize_path_key(path)
        new_by_normalized.setdefault(normalized["normalizedPath"], {})[normalized["versionPrefix"]] = {
            "originalPath": path,
            "versionPrefix": normalized["versionPrefix"],
            "spec": spec,
        }

    mapping = {"matched": [], "oldOnly": [], "newOnly": []}
    all_keys = set(old_by_normalized.keys()) | set(new_by_normalized.keys())

    for normalized_key in all_keys:
        old_versions = old_by_normalized.get(normalized_key, {})
        new_versions = new_by_normalized.get(normalized_key, {})

        matched_versions = set()
        for version, old_item in old_versions.items():
            if version in new_versions:
                mapping["matched"].append({
                    "normalizedKey": normalized_key,
                    "old": old_item,
                    "new": new_versions[version],
                    "versionChanged": False,
                })
                matched_versions.add(version)

        unmatched_old = [item for version, item in old_versions.items() if version not in matched_versions]
        unmatched_new = [item for version, item in new_versions.items() if version not in matched_versions]

        unmatched_old.sort(key=lambda item: item.get("versionPrefix") or "")
        unmatched_new.sort(key=lambda item: item.get("versionPrefix") or "")

        match_count = min(len(unmatched_old), len(unmatched_new))
        for idx in range(match_count):
            mapping["matched"].append({
                "normalizedKey": normalized_key,
                "old": unmatched_old[idx],
                "new": unmatched_new[idx],
                "versionChanged": unmatched_old[idx].get("versionPrefix") != unmatched_new[idx].get("versionPrefix"),
            })

        for idx in range(match_count, len(unmatched_old)):
            mapping["oldOnly"].append(unmatched_old[idx])
        for idx in range(match_count, len(unmatched_new)):
            mapping["newOnly"].append(unmatched_new[idx])

    return mapping


# Operation level

def extract_methods(path_obj):
    valid_methods = {"get", "post", "put", "delete", "patch", "options", "head", "trace"}
    return [key for key in path_obj.keys() if key in valid_methods]


def compare_parameters(old_params, new_params, path):
    changes = []
    old_array = old_params or []
    new_array = new_params or []

    def key_for(param):
        return f"{param.get('name')}:{param.get('in')}"

    old_by_key = {key_for(p): p for p in old_array}
    new_by_key = {key_for(p): p for p in new_array}

    for key, param in new_by_key.items():
        if key not in old_by_key:
            changes.append({
                "type": "added",
                "category": "parameter",
                "path": path,
                "field": param.get("name"),
                "oldValue": None,
                "newValue": param,
                "description": f"파라미터 추가: {param.get('name')} ({param.get('in')})",
                "severity": "medium" if param.get("required") else "low",
            })

    for key, param in old_by_key.items():
        if key not in new_by_key:
            changes.append({
                "type": "removed",
                "category": "parameter",
                "path": path,
                "field": param.get("name"),
                "oldValue": param,
                "newValue": None,
                "description": f"파라미터 삭제: {param.get('name')} ({param.get('in')})",
                "severity": "medium",
            })

    for key, new_param in new_by_key.items():
        old_param = old_by_key.get(key)
        if old_param is not None and not _json_equal(old_param, new_param):
            changes.append({
                "type": "modified",
                "category": "parameter",
                "path": path,
                "field": new_param.get("name"),
                "oldValue": old_param,
                "newValue": new_param,
                "description": f"파라미터 수정: {new_param.get('name')} ({new_param.get('in')})",
                "severity": "low",
            })

    return changes


def compare_request_body(old_body, new_body, path):
    return compare_values(old_body, new_body, "requestBody", path, "requestBody", "Request Body", "medium")


def compare_responses(old_responses, new_responses, path):
    changes = []
    old_resp = old_responses or {}
    new_resp = new_responses or {}
    all_codes = set(old_resp.keys()) | set(new_resp.keys())

    for code in all_codes:
        old_value = old_resp.get(code)
        new_value = new_resp.get(code)

        if code not in old_resp and code in new_resp:
            changes.append({
                "type": "added",
                "category": "response",
                "path": path,
                "field": f"response-{code}",
                "oldValue": None,
                "newValue": new_value,
                "description": f"응답 코드 {code} 추가",
                "severity": "low",
            })
        elif code in old_resp and code not in new_resp:
            changes.append({
                "type": "removed",
                "category": "response",
                "path": path,
                "field": f"response-{code}",
                "oldValue": old_value,
                "newValue": None,
                "description": f"응답 코드 {code} 삭제",
                "severity": "low",
            })
        elif code in old_resp and code in new_resp:
            if not _json_equal(old_value, new_value):
                changes.append({
                    "type": "modified",
                    "category": "response",
                    "path": path,
                    "field": f"response-{code}",
                    "oldValue": old_value,
                    "newValue": new_value,
                    "description": f"응답 코드 {code} 수정",
                    "severity": "low",
                })

    return changes


def compare_operation(old_op, new_op, path):
    changes = []

    changes.extend(compare_parameters(old_op.get("parameters"), new_op.get("parameters"), path))
    changes.extend(compare_request_body(old_op.get("requestBody"), new_op.get("requestBody"), path))
    changes.extend(compare_responses(old_op.get("responses"), new_op.get("responses"), path))

    changes.extend(compare_values(old_op.get("operationId"), new_op.get("operationId"), "endpoint", path, "operationId", "Operation ID", "low"))
    changes.extend(compare_values(old_op.get("summary"), new_op.get("summary"), "description", path, "summary", "요약", "low"))
    changes.extend(compare_values(old_op.get("description"), new_op.get("description"), "description", path, "description", "설명", "low"))
    changes.extend(compare_values(old_op.get("tags"), new_op.get("tags"), "tag", path, "tags", "태그", "low"))
    changes.extend(compare_values(old_op.get("deprecated"), new_op.get("deprecated"), "endpoint", path, "deprecated", "Deprecated 상태", "high"))

    changes.extend(compare_security(old_op.get("security"), new_op.get("security"), path))
    changes.extend(compare_arrays(old_op.get("servers"), new_op.get("servers"), "server", path, "url", "medium"))
    changes.extend(compare_object_maps(old_op.get("callbacks"), new_op.get("callbacks"), "callback", path, "medium"))
    changes.extend(compare_external_docs(old_op.get("externalDocs"), new_op.get("externalDocs"), path))

    return changes


def compare_paths(old_paths, new_paths):
    changes = []
    mapping = build_path_mapping(old_paths, new_paths)

    for item in mapping["newOnly"]:
        for method in extract_methods(item["spec"]):
            changes.append({
                "type": "added",
                "category": "endpoint",
                "path": f"{method.upper()} {item['originalPath']}",
                "field": None,
                "oldValue": None,
                "newValue": item["spec"].get(method),
                "description": f"새 엔드포인트 추가: {method.upper()} {item['originalPath']}",
                "severity": "high",
            })

    for item in mapping["oldOnly"]:
        for method in extract_methods(item["spec"]):
            changes.append({
                "type": "removed",
                "category": "endpoint",
                "path": f"{method.upper()} {item['originalPath']}",
                "field": None,
                "oldValue": item["spec"].get(method),
                "newValue": None,
                "description": f"엔드포인트 삭제: {method.upper()} {item['originalPath']}",
                "severity": "high",
            })

    for match in mapping["matched"]:
        old_item = match["old"]
        new_item = match["new"]
        version_changed = match["versionChanged"]
        normalized_key = match["normalizedKey"]

        old_spec = old_item["spec"]
        new_spec = new_item["spec"]

        old_methods = extract_methods(old_spec)
        new_methods = extract_methods(new_spec)
        all_methods = set(old_methods) | set(new_methods)

        path_key = new_item["originalPath"]
        changes.extend(compare_parameters(old_spec.get("parameters"), new_spec.get("parameters"), path_key))
        changes.extend(compare_values(old_spec.get("summary"), new_spec.get("summary"), "description", path_key, "summary", f"Path 요약 ({path_key})", "low"))
        changes.extend(compare_values(old_spec.get("description"), new_spec.get("description"), "description", path_key, "description", f"Path 설명 ({path_key})", "low"))
        changes.extend(compare_arrays(old_spec.get("servers"), new_spec.get("servers"), "server", path_key, "url", "medium"))

        for method in all_methods:
            old_method = old_spec.get(method)
            new_method = new_spec.get(method)
            op_path_old = f"{method.upper()} {old_item['originalPath']}"
            op_path_new = f"{method.upper()} {new_item['originalPath']}"

            if old_method is None and new_method is not None:
                changes.append({
                    "type": "added",
                    "category": "endpoint",
                    "path": op_path_new,
                    "field": None,
                    "oldValue": None,
                    "newValue": new_method,
                    "description": f"새 메서드 추가: {op_path_new}",
                    "severity": "high",
                })
                continue

            if old_method is not None and new_method is None:
                changes.append({
                    "type": "removed",
                    "category": "endpoint",
                    "path": op_path_old,
                    "field": None,
                    "oldValue": old_method,
                    "newValue": None,
                    "description": f"메서드 삭제: {op_path_old}",
                    "severity": "high",
                })
                continue

            if old_method is not None and new_method is not None:
                spec_equal = _json_equal(old_method, new_method)

                if version_changed:
                    if spec_equal:
                        changes.append({
                            "type": "path_version_changed",
                            "category": "endpoint",
                            "path": op_path_new,
                            "field": "path",
                            "oldValue": {
                                "path": old_item["originalPath"],
                                "version": old_item.get("versionPrefix"),
                            },
                            "newValue": {
                                "path": new_item["originalPath"],
                                "version": new_item.get("versionPrefix"),
                            },
                            "description": f"경로 버전 변경: {old_item['originalPath']} → {new_item['originalPath']}",
                            "severity": "medium",
                            "metadata": {
                                "oldPath": old_item["originalPath"],
                                "newPath": new_item["originalPath"],
                                "normalizedPath": normalized_key,
                                "oldVersion": old_item.get("versionPrefix"),
                                "newVersion": new_item.get("versionPrefix"),
                            },
                        })
                    else:
                        changes.append({
                            "type": "modified",
                            "category": "endpoint",
                            "path": op_path_new,
                            "field": "path_and_spec",
                            "oldValue": {
                                "path": old_item["originalPath"],
                                "version": old_item.get("versionPrefix"),
                            },
                            "newValue": {
                                "path": new_item["originalPath"],
                                "version": new_item.get("versionPrefix"),
                            },
                            "description": f"엔드포인트 버전 및 스펙 변경: {old_item['originalPath']} → {new_item['originalPath']}",
                            "severity": "high",
                            "metadata": {
                                "versionChanged": True,
                                "oldPath": old_item["originalPath"],
                                "newPath": new_item["originalPath"],
                                "normalizedPath": normalized_key,
                                "oldVersion": old_item.get("versionPrefix"),
                                "newVersion": new_item.get("versionPrefix"),
                            },
                        })
                        changes.extend(compare_operation(old_method, new_method, op_path_new))
                else:
                    changes.extend(compare_operation(old_method, new_method, op_path_new))

    return changes


# Main analysis

def analyze_changes(old_json, new_json):
    changes = []

    changes.extend(compare_values(old_json.get("openapi") or old_json.get("swagger"), new_json.get("openapi") or new_json.get("swagger"), "info", "root", "openapi/swagger", "OpenAPI/Swagger 버전", "low"))
    changes.extend(compare_info(old_json.get("info"), new_json.get("info")))
    changes.extend(compare_servers(old_json.get("servers"), new_json.get("servers")))
    changes.extend(compare_security(old_json.get("security"), new_json.get("security")))
    changes.extend(compare_tags(old_json.get("tags"), new_json.get("tags")))
    changes.extend(compare_external_docs(old_json.get("externalDocs"), new_json.get("externalDocs")))
    changes.extend(compare_paths(old_json.get("paths"), new_json.get("paths")))
    changes.extend(compare_components(old_json.get("components"), new_json.get("components")))

    if old_json.get("definitions") or new_json.get("definitions"):
        changes.extend(compare_object_maps(old_json.get("definitions"), new_json.get("definitions"), "schema", "definitions", "medium"))

    if old_json.get("securityDefinitions") or new_json.get("securityDefinitions"):
        changes.extend(compare_object_maps(old_json.get("securityDefinitions"), new_json.get("securityDefinitions"), "securityScheme", "securityDefinitions", "high"))

    changes.extend(compare_values(old_json.get("basePath"), new_json.get("basePath"), "server", "root", "basePath", "Base Path", "medium"))
    changes.extend(compare_values(old_json.get("host"), new_json.get("host"), "server", "root", "host", "Host", "medium"))
    changes.extend(compare_values(old_json.get("schemes"), new_json.get("schemes"), "server", "root", "schemes", "Schemes", "medium"))
    changes.extend(compare_values(old_json.get("consumes"), new_json.get("consumes"), "info", "root", "consumes", "Consumes (Content-Types)", "low"))
    changes.extend(compare_values(old_json.get("produces"), new_json.get("produces"), "info", "root", "produces", "Produces (Content-Types)", "low"))

    return {"hasChanges": len(changes) > 0, "changes": changes}


def get_raw_diff(old_json, new_json):
    diff = DeepDiff(old_json, new_json, ignore_order=True)
    return json.loads(diff.to_json())


__all__ = [
    "analyze_changes",
    "get_raw_diff",
    "compare_object_maps",
    "compare_arrays",
    "compare_values",
    "normalize_path_key",
    "build_path_mapping",
    "compare_servers",
    "compare_security",
    "compare_tags",
    "compare_external_docs",
    "compare_info",
    "compare_components",
    "compare_parameters",
    "compare_request_body",
    "compare_responses",
    "compare_operation",
    "compare_paths",
]
